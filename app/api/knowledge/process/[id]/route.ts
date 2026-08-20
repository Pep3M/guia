import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { chunkText, extractText } from '@/lib/document/document-processing'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { getSession } from '@/lib/auth/session'
import { resolveUserPermission } from '@/lib/auth/permission-resolver'
import { checkLimits } from '@/lib/ai/limit-validator'
import { calculateCost } from '@/lib/ai/token-calculator'
import { trackTokenUsage } from '@/lib/ai/token-tracker'
import { EMBEDDING_MODEL } from '@/lib/ai/provider'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    console.log(`[PROCESS] Starting processing for document ID: ${id}`)
    
    // Get knowledge source
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    })

    if (!knowledgeSource) {
      console.error(`[PROCESS] Knowledge source not found: ${id}`)
      return NextResponse.json(
        { error: 'Knowledge source not found' },
        { status: 404 }
      )
    }

    // Check user membership and permissions
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: knowledgeSource.organizationId,
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
      knowledgeSource.organizationId,
      "canUploadDocuments"
    )

    if (!canUpload) {
      return NextResponse.json(
        { error: 'No tienes permisos para procesar documentos' },
        { status: 403 }
      )
    }

    console.log(`[PROCESS] Found document: ${knowledgeSource.fileName} (${knowledgeSource.fileType})`)

    // Update status to processing
    await prisma.knowledgeSource.update({
      where: { id },
      data: { status: 'processing' },
    })
    console.log(`[PROCESS] Status updated to: processing`)

    // Download file from blob storage
    console.log(`[PROCESS] Downloading file from: ${knowledgeSource.fileUrl}`)
    const response = await fetch(knowledgeSource.fileUrl)
    console.log(`[PROCESS] Response status: ${response.status} ${response.statusText}`)
    console.log(`[PROCESS] Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`[PROCESS] File downloaded: ${buffer.length} bytes`)
    
    // Log first few bytes to verify it's a PDF
    if (knowledgeSource.fileType === 'pdf') {
      const header = buffer.slice(0, 10).toString('utf-8')
      console.log(`[PROCESS] PDF header check: "${header}" (should start with "%PDF-")`)
      if (!header.startsWith('%PDF-')) {
        console.error(`[PROCESS] ❌ Invalid PDF header! Got: "${header}"`)
        console.log(`[PROCESS] Full response (first 200 chars): ${buffer.toString('utf-8', 0, Math.min(200, buffer.length))}`)
      }
    }

    // Extract text from file
    console.log(`[PROCESS] Extracting text from ${knowledgeSource.fileType} file...`)
    const text = await extractText(buffer, knowledgeSource.fileType)
    console.log(`[PROCESS] Text extracted: ${text.length} characters`)
    console.log(`[PROCESS] Text preview (first 200 chars): ${text.substring(0, 200)}...`)

    // Chunk the text
    console.log(`[PROCESS] Chunking text...`)
    const chunks = await chunkText(text)
    console.log(`[PROCESS] Created ${chunks.length} chunks`)

    // Estimate tokens for embeddings
    // Rough estimate: sum of all chunk lengths / 4
    const totalCharsToEmbed = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)
    const estimatedTokens = Math.ceil(totalCharsToEmbed / 4)

    // Check limits before processing
    const limitCheck = await checkLimits(knowledgeSource.organizationId, estimatedTokens)
    if (!limitCheck.allowed) {
      await prisma.knowledgeSource.update({
        where: { id },
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
    console.log(`[PROCESS] Generating embeddings for ${chunks.length} chunks...`)
    const chunkTexts = chunks.map((chunk) => chunk.text)
    const embeddings = await generateEmbeddings(chunkTexts)
    console.log(`[PROCESS] Embeddings generated: ${embeddings.length}`)

    // Save chunks with embeddings to database
    console.log(`[PROCESS] Saving chunks to database...`)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      await prisma.$executeRaw`
        INSERT INTO "Chunk" (id, content, embedding, metadata, "sourceId", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${chunk.text},
          ${`[${embedding.join(',')}]`}::vector,
          ${JSON.stringify(chunk.metadata)}::jsonb,
          ${id},
          NOW()
        )
      `
      
      if ((i + 1) % 10 === 0) {
        console.log(`[PROCESS] Saved ${i + 1}/${chunks.length} chunks...`)
      }
    }
    console.log(`[PROCESS] All ${chunks.length} chunks saved to database`)

    // Calculate actual tokens used (more accurate after processing)
    const actualTokens = Math.ceil(totalCharsToEmbed / 3.5) // More accurate estimate
    const costUSD = calculateCost(actualTokens, 0, EMBEDDING_MODEL)

    // Track token usage
    await trackTokenUsage({
      organizationId: knowledgeSource.organizationId,
      userId: session.user.id,
      operation: 'embedding',
      tokensInput: actualTokens,
      tokensOutput: 0, // Embeddings don't have output tokens
      model: EMBEDDING_MODEL,
      costUSD,
    })

    // Update status to completed
    await prisma.knowledgeSource.update({
      where: { id },
      data: { status: 'completed' },
    })
    console.log(`[PROCESS] ✅ Processing completed successfully for ${knowledgeSource.fileName}`)

    return NextResponse.json({
      success: true,
      chunksCreated: chunks.length,
      textLength: text.length,
      tokensUsed: actualTokens,
      costUSD,
    })
  } catch (error) {
    console.error('Processing error:', error)

    // Update status to error
    await prisma.knowledgeSource.update({
      where: { id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}

