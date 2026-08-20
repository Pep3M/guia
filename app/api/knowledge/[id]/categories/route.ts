import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { resolveUserPermission } from '@/lib/auth/permission-resolver'
import { z } from 'zod'

const updateCategoriesSchema = z.object({
  categoryIds: z.array(z.string()).default([]),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH - Actualizar categorías de un documento
 * Solo usuarios con permiso canUploadDocuments pueden actualizar categorías
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateCategoriesSchema.parse(body)

    // Obtener el documento
    const knowledgeSource = await prisma.knowledgeSource.findUnique({
      where: { id },
      select: {
        organizationId: true,
      },
    })

    if (!knowledgeSource) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es miembro de la organización
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: knowledgeSource.organizationId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      )
    }

    // Verificar permisos de upload
    const canUpload = await resolveUserPermission(
      session.user.id,
      knowledgeSource.organizationId,
      'canUploadDocuments'
    )

    if (!canUpload) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar documentos' },
        { status: 403 }
      )
    }

    // Validar que todas las categorías existen y pertenecen a la organización
    if (validatedData.categoryIds.length > 0) {
      const validCategories = await prisma.category.findMany({
        where: {
          id: { in: validatedData.categoryIds },
          organizationId: knowledgeSource.organizationId,
        },
        select: {
          id: true,
        },
      })

      const validCategoryIds = validCategories.map((c) => c.id)
      const invalidCategoryIds = validatedData.categoryIds.filter(
        (id) => !validCategoryIds.includes(id)
      )

      if (invalidCategoryIds.length > 0) {
        return NextResponse.json(
          {
            error: 'Algunas categorías no existen o no pertenecen a esta organización',
            invalidCategoryIds,
          },
          { status: 400 }
        )
      }
    }

    // Actualizar categorías usando transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar todas las categorías actuales
      await tx.knowledgeSourceCategory.deleteMany({
        where: {
          sourceId: id,
        },
      })

      // Crear las nuevas relaciones
      if (validatedData.categoryIds.length > 0) {
        await tx.knowledgeSourceCategory.createMany({
          data: validatedData.categoryIds.map((categoryId) => ({
            sourceId: id,
            categoryId,
          })),
        })
      }
    })

    // Obtener el documento actualizado con categorías
    const updatedSource = await prisma.knowledgeSource.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        categories: {
          select: {
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

    return NextResponse.json(updatedSource)
  } catch (error) {
    console.error('Error updating document categories:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar categorías' },
      { status: 500 }
    )
  }
}

