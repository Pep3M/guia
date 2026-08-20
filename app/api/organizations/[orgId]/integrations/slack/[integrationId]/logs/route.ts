import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/database/prisma-server'
import { ensureOwnerOrAdmin } from '@/lib/integrations/slack/auth'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  slackUserId: z.string().optional(),
  slackChannelId: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ orgId: string; integrationId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, integrationId } = await params

    const membership = await ensureOwnerOrAdmin(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json(
        { error: 'Solo OWNER o ADMIN pueden consultar los registros' },
        { status: 403 }
      )
    }

    const integration = await prisma.slackIntegration.findFirst({
      where: {
        id: integrationId,
        organizationId: orgId,
      },
      select: { id: true },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    }

    const parsed = querySchema.parse({
      page: request.nextUrl.searchParams.get('page') ?? undefined,
      pageSize: request.nextUrl.searchParams.get('pageSize') ?? undefined,
      from: request.nextUrl.searchParams.get('from') ?? undefined,
      to: request.nextUrl.searchParams.get('to') ?? undefined,
      slackUserId: request.nextUrl.searchParams.get('slackUserId') ?? undefined,
      slackChannelId: request.nextUrl.searchParams.get('slackChannelId') ?? undefined,
    })

    let fromDate: Date | undefined
    let toDate: Date | undefined

    if (parsed.from) {
      const candidate = new Date(parsed.from)
      if (Number.isNaN(candidate.getTime())) {
        return NextResponse.json(
          { error: 'El parámetro "from" debe ser una fecha válida' },
          { status: 400 }
        )
      }
      fromDate = candidate
    }

    if (parsed.to) {
      const candidate = new Date(parsed.to)
      if (Number.isNaN(candidate.getTime())) {
        return NextResponse.json(
          { error: 'El parámetro "to" debe ser una fecha válida' },
          { status: 400 }
        )
      }
      toDate = candidate
    }

    const where: Prisma.SlackIntegrationLogWhereInput = {
      integrationId,
      organizationId: orgId,
    }

    if (parsed.slackUserId) {
      where.slackUserId = parsed.slackUserId
    }

    if (parsed.slackChannelId) {
      where.slackChannelId = parsed.slackChannelId
    }

    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      }
    }

    const skip = (parsed.page - 1) * parsed.pageSize

    const [logs, total] = await prisma.$transaction([
      prisma.slackIntegrationLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parsed.pageSize,
      }),
      prisma.slackIntegrationLog.count({ where }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize))

    return NextResponse.json({
      data: logs,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages,
      },
      filters: {
        from: fromDate?.toISOString(),
        to: toDate?.toISOString(),
        slackUserId: parsed.slackUserId,
        slackChannelId: parsed.slackChannelId,
      },
    })
  } catch (error) {
    console.error('Error fetching Slack integration logs:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al obtener los registros de Slack' },
      { status: 500 }
    )
  }
}

