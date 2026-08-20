import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido').optional().nullable(),
})

interface RouteParams {
  params: Promise<{ orgId: string }>
}

/**
 * GET - Listar todas las categorías de la organización
 * Solo miembros de la organización pueden ver las categorías
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId } = await params

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

    // Obtener todas las categorías de la organización
    const categories = await prisma.category.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            sourceCategories: true,
          },
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear una nueva categoría
 * Solo OWNER o ADMIN pueden crear categorías
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId } = await params

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
        { error: 'Solo OWNER o ADMIN pueden crear categorías' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createCategorySchema.parse(body)

    // Verificar que no exista una categoría con el mismo nombre en la organización
    const existingCategory = await prisma.category.findUnique({
      where: {
        name_organizationId: {
          name: validatedData.name,
          organizationId: orgId,
        },
      },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este nombre' },
        { status: 400 }
      )
    }

    // Crear la categoría
    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description ?? null,
        color: validatedData.color ?? null,
        organizationId: orgId,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear la categoría' },
      { status: 500 }
    )
  }
}

