import { createHmac, timingSafeEqual } from 'crypto'
import { generateText } from 'ai'
import { SlackIntegration, SlackIntegrationCategory, Category } from '@prisma/client'
import { prisma } from '@/lib/database/prisma-server'
import { generateDocumentContext } from '@/lib/ai/context-utils'
import { buildSystemPrompt } from '@/lib/ai/prompt-utils'
import { calculateTokens, calculateCost } from '@/lib/ai/token-calculator'
import { trackTokenUsage } from '@/lib/ai/token-tracker'
import { checkLimits } from '@/lib/ai/limit-validator'
import { CHAT_MODEL, chatModel } from '@/lib/ai/provider'

const SLACK_API_URL = 'https://slack.com/api'
const THINKING_MESSAGES = [
  'Espera, déjame pensar...',
  'Dame un momento para revisar la información...',
  'Estoy buscando la mejor respuesta, dame un segundo...',
  'Procesando tu pregunta, aguarda por favor...',
]

export interface SlackEventContext {
  text: string
  channelId: string
  channelName?: string
  threadTs?: string
  messageTs?: string
  slackUserId: string
  slackUserName?: string
  slackTeamId?: string
}

export type SlackIntegrationWithCategories = SlackIntegration & {
  categories: Array<
    SlackIntegrationCategory & {
      category: Category
    }
  >
}

const getRandomThinkingMessage = () =>
  THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]

const normalizeSlackMessage = (message: string, botUserId?: string | null) => {
  let cleaned = message.trim()

  if (botUserId) {
    const mentionRegex = new RegExp(`<@${botUserId}>`, 'g')
    cleaned = cleaned.replace(mentionRegex, '')
  }

  cleaned = cleaned.replace(/<@[^>]+>/g, '').replace(/\s+/g, ' ').trim()

  return cleaned
}

class SlackApiClient {
  constructor(private readonly token: string) {}

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${SLACK_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Slack API request failed with status ${response.status}`)
    }

    const data = (await response.json()) as { ok: boolean; error?: string } & T

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? 'unknown_error'}`)
    }

    return data
  }

  postMessage(body: Record<string, unknown>) {
    return this.post<{
      channel: string
      ts: string
      message: { text: string; ts: string }
    }>('chat.postMessage', body)
  }

  updateMessage(body: Record<string, unknown>) {
    return this.post<{ channel: string; ts: string }>('chat.update', body)
  }
}

export const verifySlackSignature = ({
  signingSecret,
  timestamp,
  signature,
  body,
}: {
  signingSecret: string
  timestamp: string
  signature: string
  body: string
}) => {
  const fiveMinutes = 60 * 5
  const currentTs = Math.floor(Date.now() / 1000)
  const requestTs = Number(timestamp)

  if (Number.isNaN(requestTs) || Math.abs(currentTs - requestTs) > fiveMinutes) {
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const hmac = createHmac('sha256', signingSecret)
  hmac.update(sigBasestring)
  const computed = `v0=${hmac.digest('hex')}`

  try {
    return timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(signature, 'utf8'))
  } catch {
    return computed === signature
  }
}

export const findSlackIntegrationForEvent = async ({
  teamId,
  appId,
  botUserId,
}: {
  teamId?: string
  appId?: string
  botUserId?: string
}): Promise<SlackIntegrationWithCategories | null> => {
  const identifiers: Array<Record<string, string>> = []

  if (teamId) {
    identifiers.push({ slackTeamId: teamId })
  }

  if (appId) {
    identifiers.push({ slackAppId: appId })
  }

  return prisma.slackIntegration.findFirst({
    where: {
      isActive: true,
      ...(identifiers.length ? { OR: identifiers } : {}),
      ...(botUserId ? { slackBotUserId: botUserId } : {}),
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  })
}

export const processSlackQuestion = async (
  integration: SlackIntegrationWithCategories,
  event: SlackEventContext
) => {
  if (!integration.slackBotToken) {
    console.warn('[SlackService] Missing bot token', {
      integrationId: integration.id,
    })
    throw new Error('La integración no tiene configurado el bot token')
  }

  const trimmedQuestion = normalizeSlackMessage(event.text, integration.slackBotUserId)

  if (!trimmedQuestion) {
    console.warn('[SlackService] Empty normalized question', {
      integrationId: integration.id,
      originalText: event.text,
    })
    throw new Error('No se recibió una pregunta válida')
  }

  const targetThreadTs = event.threadTs ?? event.messageTs

  if (!targetThreadTs) {
    console.warn('[SlackService] Missing thread timestamp', {
      integrationId: integration.id,
      channelId: event.channelId,
      messageTs: event.messageTs,
    })
    throw new Error('No se pudo determinar el hilo de la conversación')
  }

  const now = new Date()

  const slackThread = await prisma.slackThread.upsert({
    where: {
      integrationId_slackThreadTs: {
        integrationId: integration.id,
        slackThreadTs: targetThreadTs,
      },
    },
    update: {
      slackChannelId: event.channelId,
      slackTeamId: event.slackTeamId ?? integration.slackTeamId,
      lastMessageAt: now,
      ...(event.slackUserId ? { slackUserId: event.slackUserId } : {}),
      ...(event.slackUserName ? { slackUserName: event.slackUserName } : {}),
    },
    create: {
      integrationId: integration.id,
      slackChannelId: event.channelId,
      slackThreadTs: targetThreadTs,
      slackTeamId: event.slackTeamId ?? integration.slackTeamId,
      slackUserId: event.slackUserId,
      slackUserName: event.slackUserName,
    },
  })

  let existingUserMessageId: string | null = null

  if (event.messageTs) {
    const existingUserMessage = await prisma.slackThreadMessage.findFirst({
      where: {
        threadId: slackThread.id,
        slackMessageTs: event.messageTs,
      },
      select: {
        id: true,
      },
    })

    existingUserMessageId = existingUserMessage?.id ?? null
  }

  if (existingUserMessageId) {
    await prisma.slackThreadMessage.update({
      where: { id: existingUserMessageId },
      data: {
        content: trimmedQuestion,
        slackUserId: event.slackUserId,
        slackUserName: event.slackUserName,
      },
    })
  } else {
    await prisma.slackThreadMessage.create({
      data: {
        threadId: slackThread.id,
        role: 'user',
        content: trimmedQuestion,
        slackMessageTs: event.messageTs,
        slackUserId: event.slackUserId,
        slackUserName: event.slackUserName,
      },
    })
  }

  const threadMessages = await prisma.slackThreadMessage.findMany({
    where: { threadId: slackThread.id },
    orderBy: { createdAt: 'asc' },
    take: 40,
  })

  const mappedMessages = threadMessages.map(
    (message): { role: 'assistant' | 'user'; content: string } => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    })
  )

  let conversationMessages =
    mappedMessages.length > 0 ? [...mappedMessages] : [{ role: 'user' as const, content: trimmedQuestion }]

  if (conversationMessages[conversationMessages.length - 1].role !== 'user') {
    conversationMessages = [
      ...conversationMessages,
      { role: 'user' as const, content: trimmedQuestion },
    ]
  }

  const historyForModel = conversationMessages.slice(-20)

  const slackClient = new SlackApiClient(integration.slackBotToken)
  const thinkingMessage = getRandomThinkingMessage()

  const ensureAssistantMessage = async (content: string, messageTs?: string) => {
    if (messageTs) {
      const existingAssistantMessage = await prisma.slackThreadMessage.findFirst({
        where: {
          threadId: slackThread.id,
          slackMessageTs: messageTs,
        },
        select: {
          id: true,
        },
      })

      if (existingAssistantMessage) {
        await prisma.slackThreadMessage.update({
          where: { id: existingAssistantMessage.id },
          data: {
            role: 'assistant',
            content,
            slackUserId: integration.slackBotUserId,
            slackUserName: integration.slackBotUserName,
          },
        })
        return
      }
    }

    await prisma.slackThreadMessage.create({
      data: {
        threadId: slackThread.id,
        role: 'assistant',
        content,
        slackMessageTs: messageTs,
        slackUserId: integration.slackBotUserId,
        slackUserName: integration.slackBotUserName,
      },
    })
  }

  const refreshThreadActivity = async () => {
    await prisma.slackThread.update({
      where: { id: slackThread.id },
      data: { lastMessageAt: new Date() },
    })
  }

  let initialMessage:
    | {
        channel: string
        ts: string
      }
    | null = null
  let logRecorded = false

  try {
    initialMessage = await slackClient.postMessage({
      channel: event.channelId,
      thread_ts: slackThread.slackThreadTs,
      text: thinkingMessage,
    })
    console.info('[SlackService] Thinking message posted', {
      integrationId: integration.id,
      channel: event.channelId,
      thread: slackThread.slackThreadTs,
    })

    const startTime = performance.now()

    const categoryIds = integration.categories
      .map((categoryLink) => categoryLink.categoryId)
      .filter(Boolean)

    const estimatedTokens = calculateTokens(trimmedQuestion, CHAT_MODEL) + 4000
    const limitCheck = await checkLimits(integration.organizationId, estimatedTokens)

    if (!limitCheck.allowed) {
      const limitMessage =
        'La organización alcanzó el límite de uso para hoy. Intenta nuevamente más tarde o contacta a un administrador.'

      await slackClient.updateMessage({
        channel: initialMessage.channel,
        ts: initialMessage.ts,
        text: limitMessage,
      })

      await ensureAssistantMessage(limitMessage, initialMessage.ts)
      await refreshThreadActivity()

      await prisma.slackIntegrationLog.create({
        data: {
          integrationId: integration.id,
          organizationId: integration.organizationId,
          slackTeamId: event.slackTeamId ?? integration.slackTeamId,
          slackChannelId: event.channelId,
          slackChannel: event.channelName,
          slackThreadTs: slackThread.slackThreadTs,
          slackUserId: event.slackUserId,
          slackUserName: event.slackUserName,
          question: trimmedQuestion,
          answer: null,
          error: limitMessage,
        },
      })

      logRecorded = true
      return limitMessage
    }

    const documentContext = await generateDocumentContext(
      trimmedQuestion,
      integration.organizationId,
      5,
      categoryIds.length ? categoryIds : undefined
    )
    console.info('[SlackService] Document context generated', {
      integrationId: integration.id,
      thread: slackThread.slackThreadTs,
      categories: categoryIds,
      totalDocuments: documentContext.context.length,
    })

    const systemPrompt = buildSystemPrompt(documentContext.context, '')

    const aiResponse = await generateText({
      model: chatModel(),
      system: systemPrompt,
      messages: historyForModel,
    })

    const answer = aiResponse.text.trim()
    const tokensInput = aiResponse.usage?.inputTokens ?? estimatedTokens
    const tokensOutput =
      aiResponse.usage?.outputTokens ?? calculateTokens(answer || thinkingMessage, CHAT_MODEL)
    const costUSD = calculateCost(tokensInput, tokensOutput, CHAT_MODEL)
    const responseTimeMs = Math.round(performance.now() - startTime)

    const slackAnswer =
      answer ||
      'No encontré suficiente información para responder con seguridad. Puedes consultar otra categoría o reformular la pregunta.'

    await slackClient.updateMessage({
      channel: initialMessage.channel,
      ts: initialMessage.ts,
      text: slackAnswer,
    })

    await ensureAssistantMessage(slackAnswer, initialMessage.ts)
    await refreshThreadActivity()

    await prisma.slackIntegrationLog.create({
      data: {
        integrationId: integration.id,
        organizationId: integration.organizationId,
        slackTeamId: event.slackTeamId ?? integration.slackTeamId,
        slackChannelId: event.channelId,
        slackChannel: event.channelName,
        slackThreadTs: slackThread.slackThreadTs,
        slackUserId: event.slackUserId,
        slackUserName: event.slackUserName,
        question: trimmedQuestion,
        answer: slackAnswer,
        tokensInput,
        tokensOutput,
        responseTimeMs,
      },
    })

    logRecorded = true
    console.info('[SlackService] Interaction logged', {
      integrationId: integration.id,
      tokensInput,
      tokensOutput,
      responseTimeMs,
    })

    const userIdentifier = event.slackUserId
      ? `slack:${event.slackUserId}`
      : `integration:${integration.id}`

    await trackTokenUsage({
      organizationId: integration.organizationId,
      userId: userIdentifier,
      operation: 'chat',
      tokensInput,
      tokensOutput,
      model: CHAT_MODEL,
      costUSD,
    })

    return slackAnswer
  } catch (error) {
    console.error('[SlackService] Error processing question', {
      integrationId: integration.id,
      channel: event.channelId,
      error,
    })
    const fallbackMessage =
      'Tuvimos un problema al procesar tu solicitud. Intenta nuevamente en unos momentos.'

    if (initialMessage) {
      await slackClient.updateMessage({
        channel: initialMessage.channel,
        ts: initialMessage.ts,
        text: fallbackMessage,
      })

      await ensureAssistantMessage(fallbackMessage, initialMessage.ts)
    } else {
      const fallbackMessageData = await slackClient.postMessage({
        channel: event.channelId,
        thread_ts: slackThread.slackThreadTs,
        text: fallbackMessage,
      })

      await ensureAssistantMessage(fallbackMessage, fallbackMessageData.ts)
    }

    if (!logRecorded) {
      await prisma.slackIntegrationLog.create({
        data: {
          integrationId: integration.id,
          organizationId: integration.organizationId,
          slackTeamId: event.slackTeamId ?? integration.slackTeamId,
          slackChannelId: event.channelId,
          slackChannel: event.channelName,
          slackThreadTs: slackThread.slackThreadTs,
          slackUserId: event.slackUserId,
          slackUserName: event.slackUserName,
          question: trimmedQuestion,
          answer: null,
          error:
            error instanceof Error ? error.message : 'Error desconocido al procesar la solicitud',
        },
      })
    }

    await refreshThreadActivity()

    throw error
  }
}

export const handleSlackError = async (
  integration: SlackIntegrationWithCategories,
  messageContext: { channel: string; ts: string },
  errorMessage: string
) => {
  if (!integration.slackBotToken) {
    return
  }

  const slackClient = new SlackApiClient(integration.slackBotToken)

  await slackClient.updateMessage({
    channel: messageContext.channel,
    ts: messageContext.ts,
    text: errorMessage,
  })
}

