import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'

// GET /api/conversations/[id]/messages - Obtener mensajes de una conversación
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

    // Obtener mensajes de la conversación
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })

    // Transformar mensajes para el formato esperado
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources,
      conversationId: msg.conversationId,
      organizationId: msg.organizationId,
      createdAt: msg.createdAt.toISOString(),
    }))

    return NextResponse.json(formattedMessages)
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
