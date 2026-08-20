import path from 'node:path'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { FileNotFoundError, LOCAL_URL_PREFIX, getFile, storageDriver } from '@/lib/storage'

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

interface RouteParams {
  params: Promise<{ path: string[] }>
}

/**
 * Sirve los archivos de los drivers `local` y `s3`.
 *
 * Todo archivo exige sesión. Si además pertenece a una base de conocimiento,
 * se comprueba que quien lo pide sea miembro de esa organización: los
 * documentos son confidenciales y no deben ser accesibles sólo por conocer
 * la URL.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  if (storageDriver === 'vercel-blob') {
    // Con ese driver los archivos los sirve Vercel, no nosotros.
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { path: segments } = await params
  const key = segments.map(decodeURIComponent).join('/')

  const fileUrl = LOCAL_URL_PREFIX + segments.join('/')
  const knowledgeSource = await prisma.knowledgeSource.findFirst({
    where: { fileUrl },
    select: { organizationId: true },
  })

  if (knowledgeSource) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: knowledgeSource.organizationId,
        },
      },
      select: { id: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Sin acceso a este archivo' }, { status: 403 })
    }
  }

  try {
    const file = await getFile(key)
    const contentType =
      file.contentType ??
      CONTENT_TYPES[path.extname(key).toLowerCase()] ??
      'application/octet-stream'

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    console.error('[FILES] Error sirviendo archivo:', error)
    return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 500 })
  }
}
