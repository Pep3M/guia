import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import {
  sanitizeSlackIntegration,
  type SlackIntegrationWithRelations,
} from '@/lib/integrations/slack/serializer'
import {
  ensureMembership,
  ensureOwnerOrAdmin,
} from '@/lib/integrations/slack/auth'

const updateIntegrationSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(300).optional().nullable(),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras, números y guiones')
      .optional(),
    isActive: z.boolean().optional(),
    defaultThread: z.boolean().optional(),
    slackTeamId: z.string().max(100).optional().nullable(),
    slackTeamName: z.string().max(150).optional().nullable(),
    slackAppId: z.string().max(100).optional().nullable(),
    slackBotUserId: z.string().max(100).optional().nullable(),
    slackBotUserName: z.string().max(150).optional().nullable(),
    slackClientId: z.string().max(200).optional().nullable(),
    slackClientSecret: z.string().max(500).optional().nullable(),
    slackSigningSecret: z.string().max(200).optional().nullable(),
    slackBotToken: z.string().max(500).optional().nullable(),
    categoryIds: z.array(z.string().cuid()).min(1).optional(),
  })
  .refine(
    (payload) => {
      if (!payload.categoryIds) {
        return true
      }
      return new Set(payload.categoryIds).size === payload.categoryIds.length
    },
    { message: 'Las categorías no pueden repetirse', path: ['categoryIds'] }
  )

interface RouteParams {
  params: Promise<{ orgId: string; integrationId: string }>
}

const fetchIntegration = async (
  integrationId: string,
  organizationId: string
): Promise<SlackIntegrationWithRelations | null> =>
  prisma.slackIntegration.findFirst({
    where: {
      id: integrationId,
      organizationId,
    },
    include: {
      categories: {
        include: { category: true },
      },
    },
  })

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, integrationId } = await params

    const membership = await ensureMembership(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta organización' }, { status: 403 })
    }

    const integration = await fetchIntegration(integrationId, orgId)

    if (!integration) {
      return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    }

    return NextResponse.json(sanitizeSlackIntegration(integration))
  } catch (error) {
    console.error('Error fetching Slack integration:', error)
    return NextResponse.json(
      { error: 'Error al obtener la integración de Slack' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, integrationId } = await params

    const membership = await ensureOwnerOrAdmin(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json(
        { error: 'Solo OWNER o ADMIN pueden actualizar integraciones de Slack' },
        { status: 403 }
      )
    }

    const existingIntegration = await fetchIntegration(integrationId, orgId)

    if (!existingIntegration) {
      return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const payload = updateIntegrationSchema.parse(body)

    if (payload.slug && payload.slug !== existingIntegration.slug) {
      const existingSlug = await prisma.slackIntegration.findUnique({
        where: {
          organizationId_slug: {
            organizationId: orgId,
            slug: payload.slug,
          },
        },
      })

      if (existingSlug) {
        return NextResponse.json(
          { error: 'Ya existe una integración con el slug indicado' },
          { status: 400 }
        )
      }
    }

    if (payload.categoryIds) {
      const categories = await prisma.category.findMany({
        where: {
          id: { in: payload.categoryIds },
          organizationId: orgId,
        },
        select: { id: true },
      })

      if (categories.length !== payload.categoryIds.length) {
        return NextResponse.json(
          { error: 'Alguna de las categorías seleccionadas no pertenece a la organización' },
          { status: 400 }
        )
      }
    }

    const updateData: Prisma.SlackIntegrationUpdateInput = {}

    if (payload.name !== undefined) {
      updateData.name = payload.name
    }
    if ('description' in payload) {
      updateData.description = payload.description ?? null
    }
    if (payload.slug) {
      updateData.slug = payload.slug
    }
    if (payload.isActive !== undefined) {
      updateData.isActive = payload.isActive
    }
    if (payload.defaultThread !== undefined) {
      updateData.defaultThread = payload.defaultThread
    }
    if ('slackTeamId' in payload) {
      updateData.slackTeamId = payload.slackTeamId ?? null
    }
    if ('slackTeamName' in payload) {
      updateData.slackTeamName = payload.slackTeamName ?? null
    }
    if ('slackAppId' in payload) {
      updateData.slackAppId = payload.slackAppId ?? null
    }
    if ('slackBotUserId' in payload) {
      updateData.slackBotUserId = payload.slackBotUserId ?? null
    }
    if ('slackBotUserName' in payload) {
      updateData.slackBotUserName = payload.slackBotUserName ?? null
    }
    if ('slackClientId' in payload) {
      updateData.slackClientId = payload.slackClientId ?? null
    }
    if ('slackClientSecret' in payload) {
      updateData.slackClientSecret = payload.slackClientSecret ?? null
    }
    if ('slackSigningSecret' in payload) {
      updateData.slackSigningSecret = payload.slackSigningSecret ?? null
    }
    if ('slackBotToken' in payload) {
      updateData.slackBotToken = payload.slackBotToken ?? null
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedIntegration = await tx.slackIntegration.update({
        where: { id: integrationId },
        data: updateData,
        include: {
          categories: {
            include: { category: true },
          },
        },
      })

      if (payload.categoryIds) {
        await tx.slackIntegrationCategory.deleteMany({
          where: { integrationId },
        })

        await tx.slackIntegrationCategory.createMany({
          data: payload.categoryIds.map((categoryId) => ({
            integrationId,
            categoryId,
          })),
        })
      }

      const refreshed = await tx.slackIntegration.findUnique({
        where: { id: integrationId },
        include: {
          categories: {
            include: { category: true },
          },
        },
      })

      if (!refreshed) {
        throw new Error('No se pudo refrescar la integración actualizada')
      }

      return refreshed
    })

    return NextResponse.json(sanitizeSlackIntegration(result))
  } catch (error) {
    console.error('Error updating Slack integration:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error al actualizar la integración de Slack' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, integrationId } = await params

    const membership = await ensureOwnerOrAdmin(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json(
        { error: 'Solo OWNER o ADMIN pueden eliminar integraciones de Slack' },
        { status: 403 }
      )
    }

    const integration = await prisma.slackIntegration.findFirst({
      where: {
        id: integrationId,
        organizationId: orgId,
      },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    }

    await prisma.slackIntegration.delete({
      where: {
        id: integrationId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Slack integration:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la integración de Slack' },
      { status: 500 }
    )
  }
}

