import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { z } from 'zod'

const createGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ orgId: string }>
}

/**
 * GET - Listar todos los grupos de la organización
 * Solo miembros pueden ver los grupos
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

    // Obtener todos los grupos con información de miembros y categorías
    const groups = await prisma.group.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            members: true,
            categoryAccess: true,
          },
        },
      },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Error al obtener grupos' },
      { status: 500 }
    )
  }
}

/**
 * POST - Crear un nuevo grupo
 * Solo OWNER o ADMIN pueden crear grupos
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
        { error: 'Solo OWNER o ADMIN pueden crear grupos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createGroupSchema.parse(body)

    // Verificar que no exista un grupo con el mismo nombre en la organización
    const existingGroup = await prisma.group.findUnique({
      where: {
        name_organizationId: {
          name: validatedData.name,
          organizationId: orgId,
        },
      },
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Ya existe un grupo con este nombre' },
        { status: 400 }
      )
    }

    // Crear el grupo
    const group = await prisma.group.create({
      data: {
        name: validatedData.name,
        description: validatedData.description ?? null,
        organizationId: orgId,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al crear el grupo' },
      { status: 500 }
    )
  }
}

