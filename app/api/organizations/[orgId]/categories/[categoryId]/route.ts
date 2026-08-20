import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const updateCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido').optional().nullable(),
})

interface RouteParams {
  params: Promise<{ orgId: string; categoryId: string }>
}

/**
 * GET - Obtener detalles de una categoría específica
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, categoryId } = await params

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

    // Obtener la categoría
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        _count: {
          select: {
            sourceCategories: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la categoría pertenece a la organización
    if (category.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Categoría no encontrada en esta organización' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Error al obtener la categoría' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Actualizar una categoría
 * Solo OWNER o ADMIN pueden actualizar categorías
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, categoryId } = await params

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
        { error: 'Solo OWNER o ADMIN pueden actualizar categorías' },
        { status: 403 }
      )
    }

    // Verificar que la categoría existe y pertenece a la organización
    const existingCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        organizationId: true,
        name: true,
      },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    if (existingCategory.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Categoría no encontrada en esta organización' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateCategorySchema.parse(body)

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (validatedData.name && validatedData.name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findUnique({
        where: {
          name_organizationId: {
            name: validatedData.name,
            organizationId: orgId,
          },
        },
      })

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'Ya existe una categoría con este nombre' },
          { status: 400 }
        )
      }
    }

    // Actualizar la categoría
    const updateData: {
      name?: string
      description?: string | null
      color?: string | null
    } = {}

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    if (validatedData.color !== undefined) {
      updateData.color = validatedData.color
    }

    const category = await prisma.category.update({
      where: {
        id: categoryId,
      },
      data: updateData,
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar la categoría' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Eliminar una categoría
 * Solo OWNER o ADMIN pueden eliminar categorías
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, categoryId } = await params

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
        { error: 'Solo OWNER o ADMIN pueden eliminar categorías' },
        { status: 403 }
      )
    }

    // Verificar que la categoría existe y pertenece a la organización
    const existingCategory = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        organizationId: true,
      },
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      )
    }

    if (existingCategory.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Categoría no encontrada en esta organización' },
        { status: 404 }
      )
    }

    // Eliminar la categoría (las relaciones se eliminan en cascada)
    await prisma.category.delete({
      where: {
        id: categoryId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la categoría' },
      { status: 500 }
    )
  }
}

