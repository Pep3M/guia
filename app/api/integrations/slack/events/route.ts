import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/database/prisma-server'
import {
  findSlackIntegrationForEvent,
  processSlackQuestion,
  verifySlackSignature,
  type SlackIntegrationWithCategories,
} from '@/lib/integrations/slack/service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    if (!rawBody) {
      console.warn('[SlackEvents] Empty request body')
      return NextResponse.json({ error: 'Solicitud vacía' }, { status: 400 })
    }

    let payload: any

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.warn('[SlackEvents] Invalid JSON body', rawBody)
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (payload.type === 'url_verification') {
      console.info('[SlackEvents] URL verification request')
      return NextResponse.json({ challenge: payload.challenge })
    }

    const retryHeader = request.headers.get('x-slack-retry-num')
    if (retryHeader) {
      // Slack reintenta las peticiones si no recibe un 200 rápido
      // Respondemos temprano para evitar procesar eventos duplicados
      return NextResponse.json({ ok: true })
    }

    const teamId =
      payload.team_id ?? payload.team?.id ?? payload.event?.team ?? payload.event?.team_id
    const appId = payload.api_app_id
    const botUserId =
      payload.authorizations?.[0]?.user_id ?? payload.authorizations?.[0]?.bot_user_id

    let integration = await findSlackIntegrationForEvent({
      teamId,
      appId,
      botUserId,
    })

    const signature = request.headers.get('x-slack-signature') ?? ''
    const timestamp = request.headers.get('x-slack-request-timestamp') ?? ''

    if (!integration) {
      console.warn('[SlackEvents] Integration not found', {
        teamId,
        appId,
        botUserId,
      })

      if (!signature || !timestamp) {
        return NextResponse.json({ error: 'Integración de Slack no encontrada' }, { status: 404 })
      }

      const candidateIntegrations = await prisma.slackIntegration.findMany({
        where: {
          isActive: true,
          slackSigningSecret: { not: null },
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      })

      for (const candidate of candidateIntegrations) {
        const isValid = verifySlackSignature({
          signingSecret: candidate.slackSigningSecret ?? '',
          timestamp,
          signature,
          body: rawBody,
        })

        if (isValid) {
          integration = candidate
          console.info('[SlackEvents] Matched integration by signature', {
            integrationId: candidate.id,
            teamId,
            appId,
            botUserId,
          })
          break
        }
      }
    }

    if (!integration) {
      console.warn('[SlackEvents] Integration not found', {
        teamId,
        appId,
        botUserId,
      })
      return NextResponse.json({ error: 'Integración de Slack no encontrada' }, { status: 404 })
    }

    if (!integration.slackSigningSecret) {
      console.warn('[SlackEvents] Missing signing secret', {
        integrationId: integration.id,
      })
      return NextResponse.json(
        { error: 'La integración de Slack no tiene configurado el Signing Secret' },
        { status: 400 }
      )
    }

    const isValidSignature = verifySlackSignature({
      signingSecret: integration.slackSigningSecret,
      timestamp,
      signature,
      body: rawBody,
    })

    if (!isValidSignature) {
      console.warn('[SlackEvents] Invalid signature', {
        integrationId: integration.id,
        teamId,
        appId,
      })
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const slackEvent = payload.event

    if (!slackEvent) {
      console.warn('[SlackEvents] Missing event payload', payload)
      return NextResponse.json({ ok: true })
    }

    const slackTeamId = teamId ?? integration.slackTeamId ?? slackEvent.team ?? slackEvent.team_id

    if (slackEvent.type === 'app_mention') {
      console.info('[SlackEvents] Processing app_mention', {
        integrationId: integration.id,
        teamId,
        channel: slackEvent.channel,
        user: slackEvent.user,
      })
      if (slackEvent.subtype === 'bot_message') {
        return NextResponse.json({ ok: true })
      }

      let activeIntegration: SlackIntegrationWithCategories = integration

      const updates: Record<string, string | null> = {}

      if (!integration.slackTeamId && teamId) {
        updates.slackTeamId = teamId
      }

      if (!integration.slackBotUserId && botUserId) {
        updates.slackBotUserId = botUserId
      }

      if (
        !integration.slackBotUserName &&
        (payload.authorizations?.[0]?.user_name || payload.authorizations?.[0]?.user)
      ) {
        updates.slackBotUserName =
          payload.authorizations?.[0]?.user_name ?? payload.authorizations?.[0]?.user ?? null
      }

      if (Object.keys(updates).length > 0) {
        await prisma.slackIntegration.update({
          where: { id: integration.id },
          data: updates,
        })

        activeIntegration = {
          ...integration,
          ...updates,
        }
      }

      after(async () => {
        try {
          await processSlackQuestion(activeIntegration, {
            text: slackEvent.text ?? '',
            channelId: slackEvent.channel,
            channelName: slackEvent.channel_type,
            threadTs: slackEvent.thread_ts ?? slackEvent.ts,
            messageTs: slackEvent.ts,
            slackUserId: slackEvent.user,
            slackUserName: slackEvent.user_profile?.real_name ?? slackEvent.username,
            slackTeamId,
          })
        } catch (error) {
          console.error('[SlackEvents] Error processing mention', {
            integrationId: integration.id,
            channel: slackEvent.channel,
            user: slackEvent.user,
            error,
          })
        }
      })

      return NextResponse.json({ ok: true })
    }

    if (slackEvent.type === 'message') {
      if (slackEvent.subtype) {
        return NextResponse.json({ ok: true })
      }

      if (slackEvent.bot_id || slackEvent.user === integration.slackBotUserId) {
        return NextResponse.json({ ok: true })
      }

      const messageText = typeof slackEvent.text === 'string' ? slackEvent.text.trim() : ''

      if (!messageText) {
        return NextResponse.json({ ok: true })
      }

      const messageThreadTs = slackEvent.thread_ts ?? slackEvent.ts

      if (!messageThreadTs) {
        return NextResponse.json({ ok: true })
      }

      const existingThread = await prisma.slackThread.findUnique({
        where: {
          integrationId_slackThreadTs: {
            integrationId: integration.id,
            slackThreadTs: messageThreadTs,
          },
        },
      })

      if (!existingThread) {
        console.info('[SlackEvents] Ignoring message without tracked thread', {
          integrationId: integration.id,
          channel: slackEvent.channel,
          threadTs: messageThreadTs,
        })
        return NextResponse.json({ ok: true })
      }

      after(async () => {
        try {
          await processSlackQuestion(integration, {
            text: messageText,
            channelId: slackEvent.channel,
            channelName: slackEvent.channel_type,
            threadTs: messageThreadTs,
            messageTs: slackEvent.ts,
            slackUserId: slackEvent.user,
            slackUserName: slackEvent.user_profile?.real_name ?? slackEvent.username,
            slackTeamId,
          })
        } catch (error) {
          console.error('[SlackEvents] Error processing thread message', {
            integrationId: integration.id,
            channel: slackEvent.channel,
            user: slackEvent.user,
            threadTs: messageThreadTs,
            error,
          })
        }
      })

      return NextResponse.json({ ok: true })
    }

    console.info('[SlackEvents] Unhandled event type', {
      type: slackEvent.type,
      callbackType: payload.type,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[SlackEvents] Handler error', error)
    return NextResponse.json({ error: 'Error al procesar el evento de Slack' }, { status: 500 })
  }
}

