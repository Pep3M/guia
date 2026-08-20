import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'

// GET /api/conversations/[id] - Obtener conversación específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id: conversationId } = await params

    // Obtener conversación con mensajes
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: conversation.organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversación' }, { status: 403 })
    }

    // Transformar mensajes para el formato esperado
    const messages = conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      conversationId: msg.conversationId,
      organizationId: msg.organizationId,
      createdAt: msg.createdAt.toISOString(),
    }))

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/conversations/[id] - Actualizar conversación (título)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const body = await req.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Verificar que la conversación existe y el usuario tiene acceso
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: conversation.organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversación' }, { status: 403 })
    }

    // Actualizar título
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })

    return NextResponse.json({
      id: updatedConversation.id,
      title: updatedConversation.title,
      organizationId: updatedConversation.organizationId,
      userId: updatedConversation.userId,
      createdAt: updatedConversation.createdAt.toISOString(),
      updatedAt: updatedConversation.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/conversations/[id] - Eliminar conversación
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id: conversationId } = await params

    // Verificar que la conversación existe y el usuario tiene acceso
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: conversation.organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversación' }, { status: 403 })
    }

    // Eliminar conversación (los mensajes se eliminan por cascade)
    await prisma.conversation.delete({
      where: { id: conversationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
