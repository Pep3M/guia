import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'
import { generateConversationTitle } from '@/lib/ai/title-generation'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const { conversationId, userMessage, assistantMessage } = body

    if (!conversationId || !userMessage) {
      return NextResponse.json({ 
        error: 'conversationId y userMessage son requeridos' 
      }, { status: 400 })
    }

    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        organization: {
          include: {
            memberships: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es miembro de la organización
    if (!conversation.organization.memberships.length) {
      return NextResponse.json({ 
        error: 'No tienes acceso a esta conversación' 
      }, { status: 403 })
    }

    // Generar el título usando IA
    const title = await generateConversationTitle(userMessage, assistantMessage)

    // Actualizar la conversación con el nuevo título
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })

    return NextResponse.json({ title })
  } catch (error) {
    console.error('Error generating conversation title:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
