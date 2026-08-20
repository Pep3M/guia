import { NextRequest, NextResponse } from 'next/server'
import { FileAlreadyExistsError, putFile } from '@/lib/storage'
import { prisma } from '@/lib/database/prisma-server'
import { extractText, chunkText } from '@/lib/document/document-processing'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { getSession } from '@/lib/auth/session'
import { checkLimits } from '@/lib/ai/limit-validator'
import { calculateCost } from '@/lib/ai/token-calculator'
import { trackTokenUsage } from '@/lib/ai/token-tracker'
import { resolveUserPermission } from '@/lib/auth/permission-resolver'
import { EMBEDDING_MODEL } from '@/lib/ai/provider'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const organizationId = formData.get('organizationId') as string
    const categoryIdsStr = formData.get('categoryIds') as string | null
    const allowOverwriteRaw = formData.get('allowOverwrite')
    const allowOverwrite = allowOverwriteRaw === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Parse categoryIds (can be JSON array string or comma-separated)
    let categoryIds: string[] = []
    if (categoryIdsStr) {
      try {
        // Try parsing as JSON array first
        const parsed = JSON.parse(categoryIdsStr)
        categoryIds = Array.isArray(parsed) ? parsed : []
      } catch {
        // If not JSON, try comma-separated
        categoryIds = categoryIdsStr.split(',').filter((id) => id.trim().length > 0)
      }
    }

    // Verify user is member of organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      )
    }

    // Check user permissions using permission resolver (considers superadmin restrictions, org overrides, and role)
    const canUpload = await resolveUserPermission(
      session.user.id,
      organizationId,
      "canUploadDocuments"
    )

    if (!canUpload) {
      return NextResponse.json(
        { error: 'No tienes permisos para subir documentos' },
        { status: 403 }
      )
    }

    // ponytail: sin cuotas de plan en self-hosted; el disco es del cliente.
    // Sólo se limita el tamaño por archivo, que sí se lee entero en memoria.
    const maxUploadBytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 50) * 1024 * 1024
    if (file.size > maxUploadBytes) {
      return NextResponse.json(
        { error: `El archivo supera el tamaño máximo permitido (${process.env.MAX_UPLOAD_SIZE_MB ?? 50} MB)` },
        { status: 413 }
      )
    }

    console.log(`[UPLOAD] Received file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)

    // Validate file type
    const fileType = file.name.split('.').pop()?.toLowerCase()
    if (!fileType || !['pdf', 'txt', 'md'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, TXT, and MD files are allowed.' },
        { status: 400 }
      )
    }

    // Convert file to buffer for immediate processing
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`[UPLOAD] File converted to buffer: ${buffer.length} bytes`)

    // Guardar el archivo original en el almacenamiento configurado.
    // Si falla, el documento se procesa igualmente: lo que importa son los chunks.
    let blobUrl = `local://${file.name}` // Fallback URL
    try {
      const stored = await putFile(file.name, file, { allowOverwrite })
      blobUrl = stored.url
      console.log(`[UPLOAD] ✅ Archivo almacenado en: ${stored.url}`)
    } catch (blobError) {
      if (blobError instanceof FileAlreadyExistsError && !allowOverwrite) {
        console.warn(`[UPLOAD] ⚠️ Conflicto de nombre en el almacenamiento:`, blobError)

        return NextResponse.json(
          {
            error: 'El archivo ya existe',
            requiresOverwrite: true,
            fileName: file.name,
            message:
              'Ya existe un archivo con este nombre en el almacenamiento. Confirma si deseas sobrescribirlo.',
          },
          { status: 409 }
        )
      }

      console.warn(`[UPLOAD] ⚠️ No se pudo almacenar el archivo (el procesado continúa):`, blobError)
    }

    // Validate categoryIds if provided
    if (categoryIds.length > 0) {
      const validCategories = await prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          organizationId,
        },
        select: {
          id: true,
        },
      })

      const validCategoryIds = validCategories.map((c) => c.id)
      const invalidCategoryIds = categoryIds.filter((id) => !validCategoryIds.includes(id))

      if (invalidCategoryIds.length > 0) {
        return NextResponse.json(
          {
            error: 'Algunas categorías no existen o no pertenecen a esta organización',
            invalidCategoryIds,
          },
          { status: 400 }
        )
      }
    }

    // Create knowledge source record with 'processing' status
    const knowledgeSource = await prisma.knowledgeSource.create({
      data: {
        fileName: file.name,
        fileUrl: blobUrl,
        fileType,
        fileSizeBytes: BigInt(file.size), // Store actual file size
        status: 'processing',
        organizationId,
        categories: {
          create: categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
      },
    })
    console.log(`[UPLOAD] Created knowledge source: ${knowledgeSource.id} with ${categoryIds.length} categories`)

    // Process immediately (inline instead of background)
    try {
      console.log(`[UPLOAD] Starting inline processing...`)
      
      // Extract text from file
      const text = await extractText(buffer, fileType)
      console.log(`[UPLOAD] Text extracted: ${text.length} characters`)

      // Chunk the text
      const chunks = await chunkText(text)
      console.log(`[UPLOAD] Created ${chunks.length} chunks`)

      // Estimate tokens for embeddings
      const totalCharsToEmbed = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)
      const estimatedTokens = Math.ceil(totalCharsToEmbed / 4)
      console.log(`[UPLOAD] Estimated tokens: ${estimatedTokens}`)

      // Check limits before processing
      const limitCheck = await checkLimits(organizationId, estimatedTokens)
      if (!limitCheck.allowed) {
        await prisma.knowledgeSource.update({
          where: { id: knowledgeSource.id },
          data: {
            status: 'error',
            errorMessage: `Límite de uso alcanzado: ${limitCheck.reason}`,
          },
        })

        return NextResponse.json(
          {
            error: 'Límite de uso alcanzado',
            reason: limitCheck.reason,
            usage: limitCheck.usage,
            limits: limitCheck.limits,
          },
          { status: 429 }
        )
      }

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map((chunk) => chunk.text)
      const embeddings = await generateEmbeddings(chunkTexts)
      console.log(`[UPLOAD] Embeddings generated: ${embeddings.length}`)

      // Save chunks with embeddings to database
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]

        await prisma.$executeRaw`
          INSERT INTO "Chunk" (id, content, embedding, metadata, "sourceId", "organizationId", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${chunk.text},
            ${`[${embedding.join(',')}]`}::vector,
            ${JSON.stringify(chunk.metadata)}::jsonb,
            ${knowledgeSource.id},
            ${organizationId},
            NOW()
          )
        `
      }
      console.log(`[UPLOAD] All ${chunks.length} chunks saved to database`)

      // Calculate actual tokens used (more accurate after processing)
      const actualTokens = Math.ceil(totalCharsToEmbed / 3.5) // More accurate estimate
      const costUSD = calculateCost(actualTokens, 0, EMBEDDING_MODEL)
      console.log(`[UPLOAD] Tokens used: ${actualTokens}, Cost: $${costUSD.toFixed(4)}`)

      // Track token usage
      await trackTokenUsage({
        organizationId,
        userId: session.user.id,
        operation: 'embedding',
        tokensInput: actualTokens,
        tokensOutput: 0, // Embeddings don't have output tokens
        model: EMBEDDING_MODEL,
        costUSD,
      })
      console.log(`[UPLOAD] ✅ Token usage tracked`)

      // Update status to completed
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSource.id },
        data: { status: 'completed' },
      })
      console.log(`[UPLOAD] ✅ Processing completed successfully`)

      return NextResponse.json({
        id: knowledgeSource.id,
        fileName: knowledgeSource.fileName,
        status: 'completed',
        chunksCreated: chunks.length,
        tokensUsed: actualTokens,
        costUSD,
      })
    } catch (processingError) {
      console.error('[UPLOAD] Processing error:', processingError)
      
      // Update status to error
      await prisma.knowledgeSource.update({
        where: { id: knowledgeSource.id },
        data: {
          status: 'error',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
        },
      })

      return NextResponse.json(
        { 
          error: 'Failed to process document',
          details: processingError instanceof Error ? processingError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

