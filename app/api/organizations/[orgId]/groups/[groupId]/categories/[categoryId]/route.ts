import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'

interface RouteParams {
  params: Promise<{ orgId: string; groupId: string; categoryId: string }>
}

/**
 * DELETE - Revocar acceso a una categoría del grupo
 * Solo OWNER o ADMIN pueden gestionar acceso a categorías
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, groupId, categoryId } = await params

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

    // Verificar que la categoría existe y pertenece a la organización
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
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

    // Verificar que el grupo tiene acceso a esta categoría
    const categoryAccess = await prisma.groupCategoryAccess.findUnique({
      where: {
        groupId_categoryId: {
          groupId,
          categoryId,
        },
      },
    })

    if (!categoryAccess) {
      return NextResponse.json(
        { error: 'El grupo no tiene acceso a esta categoría' },
        { status: 404 }
      )
    }

    // Revocar acceso a la categoría
    await prisma.groupCategoryAccess.delete({
      where: {
        id: categoryAccess.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing category access from group:', error)
    return NextResponse.json(
      { error: 'Error al revocar acceso a la categoría' },
      { status: 500 }
    )
  }
}

