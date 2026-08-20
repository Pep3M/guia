import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import { getSession } from '@/lib/auth/session'

// POST /api/messages/[id]/feedback - Guardar feedback de un mensaje
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id: messageId } = await params
    const body = await req.json()
    const { feedback } = body

    if (!feedback || !['positive', 'negative'].includes(feedback)) {
      return NextResponse.json({ error: 'Feedback inválido' }, { status: 400 })
    }

    // Verificar que el mensaje existe y el usuario tiene acceso
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: message.organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a este mensaje' }, { status: 403 })
    }

    // Guardar feedback (por ahora solo log, en el futuro se puede agregar tabla de feedback)
    console.log(`Feedback ${feedback} para mensaje ${messageId} de usuario ${session.user.id}`)
    
    // TODO: Crear tabla MessageFeedback en el futuro para analytics
    // await prisma.messageFeedback.create({
    //   data: {
    //     messageId,
    //     userId: session.user.id,
    //     feedback,
    //   },
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving message feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
