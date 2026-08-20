import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string; userId: string }>
}

/**
 * DELETE - Remover un usuario del grupo
 * Solo OWNER o ADMIN pueden remover miembros
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, groupId, userId } = await params

    // Verificar que el usuario es OWNER o ADMIN
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
      select: {
        role: true,
      },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Solo OWNER o ADMIN pueden remover miembros de grupos' },
        { status: 403 }
      )
    }

    // Verificar que el grupo existe y pertenece a la organización
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        organizationId: true,
      },
    })

    if (!group || group.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el usuario está en el grupo
    const groupMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
    })

    if (!groupMember) {
      return NextResponse.json(
        { error: 'El usuario no está en este grupo' },
        { status: 404 }
      )
    }

    // Remover el usuario del grupo
    await prisma.groupMember.delete({
      where: {
        id: groupMember.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member from group:', error)
    return NextResponse.json(
      { error: 'Error al remover miembro del grupo' },
      { status: 500 }
    )
  }
}

