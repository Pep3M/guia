import { NextResponse, NextRequest } from 'next/server'
import { deleteFile } from '@/lib/storage'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
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

    const knowledgeSources = await prisma.knowledgeSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        errorMessage: true,
        fileSizeBytes: true,
        createdAt: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        _count: {
          select: { chunks: true },
        },
      },
    })

    // Convert BigInt to string for JSON serialization
    const serializedSources = knowledgeSources.map((source) => ({
      ...source,
      fileSizeBytes: source.fileSizeBytes ? source.fileSizeBytes.toString() : null,
    }))

    return NextResponse.json(serializedSources)
  } catch (error) {
    console.error('Get knowledge sources error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge sources' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const organizationId = searchParams.get('organizationId')

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
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

    // Get the knowledge source to retrieve the file URL and verify ownership
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id },
      select: { fileUrl: true, organizationId: true },
    })

    if (!knowledgeSource) {
      return NextResponse.json(
        { error: 'Knowledge source not found' },
        { status: 404 }
      )
    }

    // Verify the knowledge source belongs to the organization
    if (knowledgeSource.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'No tienes acceso a este documento' },
        { status: 403 }
      )
    }

    // Delete the file from Vercel Blob
    try {
      if (!knowledgeSource.fileUrl.startsWith('local://')) {
        await deleteFile(knowledgeSource.fileUrl)
      }
    } catch (blobError) {
      console.error('Error deleting blob file:', blobError)
      // Continue with database deletion even if blob deletion fails
    }

    // Delete the knowledge source from database (this will cascade delete chunks)
    await prisma.knowledgeSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete knowledge source error:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge source' },
      { status: 500 }
    )
  }
}

