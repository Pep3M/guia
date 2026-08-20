import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { sanitizeSlackIntegration } from '@/lib/integrations/slack/serializer'
import { ensureMembership, ensureOwnerOrAdmin } from '@/lib/integrations/slack/auth'

const createIntegrationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(80),
  description: z.string().max(300).optional().nullable(),
  categoryIds: z.array(z.string().cuid()).min(1).optional(),
})

interface RouteParams {
  params: Promise<{ orgId: string }>
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const generateUniqueSlug = async (organizationId: string, name: string) => {
  const baseSlug = slugify(name)
  if (!baseSlug) {
    const fallback = `slack-bot-${Date.now()}`
    return fallback
  }

  let candidate = baseSlug
  let counter = 1

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.slackIntegration.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug: candidate,
        },
      },
    })

    if (!existing) {
      return candidate
    }

    counter += 1
    candidate = `${baseSlug}-${counter}`
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId } = await params

    const membership = await ensureMembership(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json({ error: 'No tienes acceso a esta organización' }, { status: 403 })
    }

    const integrations = await prisma.slackIntegration.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    return NextResponse.json(integrations.map(sanitizeSlackIntegration))
  } catch (error) {
    console.error('Error fetching Slack integrations:', error)
    return NextResponse.json({ error: 'Error al obtener integraciones Slack' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId } = await params

    const membership = await ensureOwnerOrAdmin(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json(
        { error: 'Solo OWNER o ADMIN pueden crear integraciones de Slack' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const payload = createIntegrationSchema.parse(body)

    if (payload.categoryIds?.length) {
      const categories = await prisma.category.findMany({
        where: {
          id: {
            in: payload.categoryIds,
          },
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

    const slug = await generateUniqueSlug(orgId, payload.name)

    const integration = await prisma.slackIntegration.create({
      data: {
        organizationId: orgId,
        name: payload.name,
        description: payload.description ?? null,
        slug,
        categories:
          payload.categoryIds?.length
            ? {
                create: payload.categoryIds.map((categoryId) => ({
                  category: {
                    connect: { id: categoryId },
                  },
                })),
              }
            : undefined,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    return NextResponse.json(sanitizeSlackIntegration(integration), { status: 201 })
  } catch (error) {
    console.error('Error creating Slack integration:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error al crear la integración de Slack' },
      { status: 500 }
    )
  }
}

