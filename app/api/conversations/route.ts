import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'
import { resolveUserPermission } from '@/lib/auth/permission-resolver'

// GET /api/conversations - Listar conversaciones de una organización
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta organización' }, { status: 403 })
    }

    // Obtener conversaciones del usuario en la organización
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId,
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        organizationId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    // Transformar para incluir messageCount
    const conversationsWithCount = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      organizationId: conv.organizationId,
      userId: conv.userId,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: conv._count.messages,
    }))

    return NextResponse.json(conversationsWithCount)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/conversations - Crear nueva conversación
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { title, organizationId } = body

    if (!title || !organizationId) {
      return NextResponse.json({ error: 'Title and organizationId are required' }, { status: 400 })
    }

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta organización' }, { status: 403 })
    }

    // Check user restrictions using permission resolver (considers org overrides)
    const canCreate = await resolveUserPermission(
      session.user.id,
      organizationId,
      "canCreateConversations"
    )

    if (!canCreate) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear conversaciones' },
        { status: 403 }
      )
    }

    // Crear nueva conversación
    const conversation = await prisma.conversation.create({
      data: {
        title,
        organizationId,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: 0,
    })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
