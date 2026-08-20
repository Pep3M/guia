import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string().min(1, 'El ID del usuario es requerido'),
})

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string }>
}

/**
 * POST - Agregar un usuario al grupo
 * Solo OWNER o ADMIN pueden agregar miembros
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, groupId } = await params

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
        { error: 'Solo OWNER o ADMIN pueden agregar miembros a grupos' },
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

    const body = await request.json()
    const validatedData = addMemberSchema.parse(body)

    // Verificar que el usuario es miembro de la organización
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: validatedData.userId,
          organizationId: orgId,
        },
      },
    })

    if (!userMembership) {
      return NextResponse.json(
        { error: 'El usuario no es miembro de esta organización' },
        { status: 400 }
      )
    }

    // Verificar que el usuario no está ya en el grupo
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: validatedData.userId,
          groupId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'El usuario ya está en este grupo' },
        { status: 400 }
      )
    }

    // Agregar el usuario al grupo
    const groupMember = await prisma.groupMember.create({
      data: {
        userId: validatedData.userId,
        groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(groupMember, { status: 201 })
  } catch (error) {
    console.error('Error adding member to group:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al agregar miembro al grupo' },
      { status: 500 }
    )
  }
}

