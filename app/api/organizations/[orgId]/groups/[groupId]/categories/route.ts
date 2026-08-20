import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const addCategoryAccessSchema = z.object({
  categoryId: z.string().min(1, 'El ID de la categoría es requerido'),
})

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string }>
}

/**
 * POST - Dar acceso a una categoría al grupo
 * Solo OWNER o ADMIN pueden gestionar acceso a categorías
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
        { error: 'Solo OWNER o ADMIN pueden gestionar acceso a categorías' },
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
    const validatedData = addCategoryAccessSchema.parse(body)

    // Verificar que la categoría existe y pertenece a la organización
    const category = await prisma.category.findUnique({
      where: {
        id: validatedData.categoryId,
      },
      select: {
        organizationId: true,
      },
    })

    if (!category || category.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el grupo no tiene ya acceso a esta categoría
    const existingAccess = await prisma.groupCategoryAccess.findUnique({
      where: {
        groupId_categoryId: {
          groupId,
          categoryId: validatedData.categoryId,
        },
      },
    })

    if (existingAccess) {
      return NextResponse.json(
        { error: 'El grupo ya tiene acceso a esta categoría' },
        { status: 400 }
      )
    }

    // Dar acceso a la categoría
    const categoryAccess = await prisma.groupCategoryAccess.create({
      data: {
        groupId,
        categoryId: validatedData.categoryId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(categoryAccess, { status: 201 })
  } catch (error) {
    console.error('Error adding category access to group:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al dar acceso a la categoría' },
      { status: 500 }
    )
  }
}

