import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const updateGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string }>
}

/**
 * GET - Obtener detalles de un grupo específico
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, groupId } = await params

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      )
    }

    // Obtener el grupo con miembros y categorías
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      include: {
        members: {
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
        },
        categoryAccess: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el grupo pertenece a la organización
    if (group.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Grupo no encontrado en esta organización' },
        { status: 404 }
      )
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Error al obtener el grupo' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Actualizar un grupo
 * Solo OWNER o ADMIN pueden actualizar grupos
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Solo OWNER o ADMIN pueden actualizar grupos' },
        { status: 403 }
      )
    }

    // Verificar que el grupo existe y pertenece a la organización
    const existingGroup = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        organizationId: true,
        name: true,
      },
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      )
    }

    if (existingGroup.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Grupo no encontrado en esta organización' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateGroupSchema.parse(body)

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (validatedData.name && validatedData.name !== existingGroup.name) {
      const duplicateGroup = await prisma.group.findUnique({
        where: {
          name_organizationId: {
            name: validatedData.name,
            organizationId: orgId,
          },
        },
      })

      if (duplicateGroup) {
        return NextResponse.json(
          { error: 'Ya existe un grupo con este nombre' },
          { status: 400 }
        )
      }
    }

    // Actualizar el grupo
    const updateData: {
      name?: string
      description?: string | null
    } = {}

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }

    const group = await prisma.group.update({
      where: {
        id: groupId,
      },
      data: updateData,
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error updating group:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar el grupo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Eliminar un grupo
 * Solo OWNER o ADMIN pueden eliminar grupos
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Solo OWNER o ADMIN pueden eliminar grupos' },
        { status: 403 }
      )
    }

    // Verificar que el grupo existe y pertenece a la organización
    const existingGroup = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        organizationId: true,
      },
    })

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Grupo no encontrado' },
        { status: 404 }
      )
    }

    if (existingGroup.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Grupo no encontrado en esta organización' },
        { status: 404 }
      )
    }

    // Eliminar el grupo (las relaciones se eliminan en cascada)
    await prisma.group.delete({
      where: {
        id: groupId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el grupo' },
      { status: 500 }
    )
  }
}

