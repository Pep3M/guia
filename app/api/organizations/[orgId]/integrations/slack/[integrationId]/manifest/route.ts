import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { ensureOwnerOrAdmin } from '@/lib/integrations/slack/auth'
import { prisma } from '@/lib/database/prisma-server'
import { buildSlackManifest } from '@/lib/integrations/slack/manifest'

interface RouteParams {
  params: Promise<{ orgId: string; integrationId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { orgId, integrationId } = await params

    const membership = await ensureOwnerOrAdmin(session.user.id, orgId)

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes permisos para generar el manifest de Slack' },
        { status: 403 }
      )
    }

    const integration = await prisma.slackIntegration.findFirst({
      where: {
        id: integrationId,
        organizationId: orgId,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integración no encontrada' }, { status: 404 })
    }

    const manifest = buildSlackManifest(integration)

    return NextResponse.json(manifest, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generating Slack manifest:', error)
    return NextResponse.json(
      { error: 'Error al generar el manifest de Slack' },
      { status: 500 }
    )
  }
}

