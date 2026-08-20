import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { LOCAL_URL_PREFIX, resolveStoragePath, storageDriver } from '@/lib/storage'

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
 * Sirve los archivos del driver de almacenamiento local.
 *
 * Todo archivo exige sesión. Si además pertenece a una base de conocimiento,
 * se comprueba que quien lo pide sea miembro de esa organización: los
 * documentos son confidenciales y no deben ser accesibles sólo por conocer
 * la URL.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  if (storageDriver !== 'local') {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { path: segments } = await params
  const key = segments.map(decodeURIComponent).join('/')

  let filePath: string
  try {
    filePath = resolveStoragePath(key)
  } catch {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 })
  }

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
    const info = await stat(filePath)
    if (!info.isFile()) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const contents = await readFile(filePath)
    const contentType =
      CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'

    return new NextResponse(new Uint8Array(contents), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(info.size),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
}
