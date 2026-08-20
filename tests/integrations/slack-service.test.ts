import { describe, expect, it, beforeEach, afterAll, vi, type Mock } from 'vitest'
import { createHmac } from 'crypto'
import type { SlackIntegrationWithCategories } from '@/lib/integrations/slack/manifest'

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-key'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db'

vi.mock('@/lib/ai/context-utils', () => ({
  generateDocumentContext: vi.fn(),
}))

vi.mock('@/lib/ai/prompt-utils', () => ({
  buildSystemPrompt: vi.fn(() => 'system prompt'),
}))

vi.mock('@/lib/ai/token-calculator', () => ({
  calculateTokens: () => 100,
  calculateCost: () => 0.05,
}))

vi.mock('@/lib/ai/token-tracker', () => ({
  trackTokenUsage: vi.fn(),
}))

vi.mock('@/lib/ai/limit-validator', () => ({
  checkLimits: vi.fn(() => ({ allowed: true })),
}))

vi.mock('@/lib/ai/provider', () => ({
  chatModel: vi.fn(() => 'mock-chat-model'),
  CHAT_MODEL: 'gpt-4o-mini',
  RAG_MAX_CHUNKS: 5,
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

const prismaMock = {
  slackThread: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  slackThreadMessage: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  slackIntegrationLog: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/database/prisma-server', () => ({
  prisma: prismaMock,
}))

const providerModule = await import('@/lib/ai/provider')
const chatModel = providerModule.chatModel as unknown as Mock

const aiModule = await import('ai')
const generateText = aiModule.generateText as unknown as Mock

const contextModule = await import('@/lib/ai/context-utils')
const generateDocumentContext = contextModule.generateDocumentContext as unknown as Mock

const promptModule = await import('@/lib/ai/prompt-utils')
const buildSystemPrompt = promptModule.buildSystemPrompt as unknown as Mock

const trackerModule = await import('@/lib/ai/token-tracker')
const trackTokenUsage = trackerModule.trackTokenUsage as unknown as Mock

const limitsModule = await import('@/lib/ai/limit-validator')
const checkLimits = limitsModule.checkLimits as unknown as Mock

const { verifySlackSignature, processSlackQuestion } = await import('@/lib/integrations/slack/service')
const { buildSlackManifest } = await import('@/lib/integrations/slack/manifest')

const originalFetch = global.fetch

afterAll(() => {
  global.fetch = originalFetch
})

describe('processSlackQuestion', () => {
  const fetchMock = vi.fn<(input: RequestInfo, init?: RequestInit) => Promise<Response>>()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input: RequestInfo) => {
      if (typeof input === 'string' && input.endsWith('chat.postMessage')) {
        return new Response(
          JSON.stringify({
            ok: true,
            channel: 'C123',
            ts: '1700000000.000400',
            message: { text: 'thinking', ts: '1700000000.000400' },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      if (typeof input === 'string' && input.endsWith('chat.update')) {
        return new Response(
          JSON.stringify({
            ok: true,
            channel: 'C123',
            ts: '1700000000.000400',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })

    global.fetch = fetchMock as unknown as typeof global.fetch

    Object.values(prismaMock.slackThread).forEach((fn) => fn.mockReset())
    Object.values(prismaMock.slackThreadMessage).forEach((fn) => fn.mockReset())
    prismaMock.slackIntegrationLog.create.mockReset()

    chatModel.mockReset()
    chatModel.mockImplementation(() => 'mock-chat-model')

    buildSystemPrompt.mockReset()
    buildSystemPrompt.mockReturnValue('system prompt')

    checkLimits.mockReset()
    checkLimits.mockResolvedValue({ allowed: true })

    generateDocumentContext.mockReset()
    generateDocumentContext.mockResolvedValue({ context: [] })

    generateText.mockReset()
    generateText.mockResolvedValue({
      text: 'Respuesta generada',
      usage: {
        inputTokens: 150,
        outputTokens: 80,
      },
    })

    trackTokenUsage.mockReset()
    trackTokenUsage.mockResolvedValue(undefined)
  })

  it('persists thread messages and uses conversation history for responses', async () => {
    prismaMock.slackThread.upsert.mockResolvedValue({
      id: 'thread-1',
      integrationId: 'int-1',
      slackThreadTs: '1700000000.000200',
      slackChannelId: 'C123',
    })
    prismaMock.slackThread.update.mockResolvedValue({})
    prismaMock.slackThreadMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    prismaMock.slackThreadMessage.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'user',
        content: 'Seguimos conversando',
        slackMessageTs: '1700000000.000201',
        createdAt: new Date(),
      },
    ])
    prismaMock.slackThreadMessage.create.mockResolvedValue({})
    prismaMock.slackIntegrationLog.create.mockResolvedValue({})

    const integration = {
      id: 'int-1',
      organizationId: 'org-1',
      name: 'Bot',
      description: null,
      slug: 'bot',
      slackTeamId: 'T123',
      slackTeamName: null,
      slackAppId: null,
      slackClientId: null,
      slackClientSecret: null,
      slackSigningSecret: 'signing-secret',
      slackBotToken: 'xoxb-token',
      slackBotUserId: 'Ubot',
      slackBotUserName: 'Guia Bot',
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as unknown as SlackIntegrationWithCategories

    await processSlackQuestion(integration, {
      text: 'Seguimos conversando',
      channelId: 'C123',
      channelName: 'channel',
      threadTs: '1700000000.000200',
      messageTs: '1700000000.000201',
      slackUserId: 'U123',
      slackUserName: 'Usuario Uno',
      slackTeamId: 'T123',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://slack.com/api/chat.postMessage',
      expect.objectContaining({
        method: 'POST',
      })
    )

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: 'Seguimos conversando',
          },
        ],
      })
    )

    expect(prismaMock.slackThreadMessage.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'user',
          content: 'Seguimos conversando',
          slackMessageTs: '1700000000.000201',
        }),
      })
    )

    expect(prismaMock.slackThreadMessage.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
          content: 'Respuesta generada',
          slackMessageTs: '1700000000.000400',
        }),
      })
    )

    expect(prismaMock.slackIntegrationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slackThreadTs: '1700000000.000200',
          answer: 'Respuesta generada',
        }),
      })
    )

    expect(trackTokenUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        userId: 'slack:U123',
        operation: 'chat',
      })
    )
  })

  it('returns a limit message when usage limits are exceeded', async () => {
    prismaMock.slackThread.upsert.mockResolvedValue({
      id: 'thread-1',
      integrationId: 'int-1',
      slackThreadTs: '1700000000.000200',
      slackChannelId: 'C123',
    })
    prismaMock.slackThread.update.mockResolvedValue({})
    prismaMock.slackThreadMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    prismaMock.slackThreadMessage.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'user',
        content: 'Seguimos conversando',
        slackMessageTs: '1700000000.000201',
        createdAt: new Date(),
      },
    ])
    prismaMock.slackThreadMessage.create.mockResolvedValue({})
    prismaMock.slackIntegrationLog.create.mockResolvedValue({})

    checkLimits.mockResolvedValueOnce({ allowed: false })

    const integration = {
      id: 'int-1',
      organizationId: 'org-1',
      name: 'Bot',
      description: null,
      slug: 'bot',
      slackTeamId: 'T123',
      slackTeamName: null,
      slackAppId: null,
      slackClientId: null,
      slackClientSecret: null,
      slackSigningSecret: 'signing-secret',
      slackBotToken: 'xoxb-token',
      slackBotUserId: 'Ubot',
      slackBotUserName: 'Guia Bot',
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as unknown as SlackIntegrationWithCategories

    const result = await processSlackQuestion(integration, {
      text: 'Seguimos conversando',
      channelId: 'C123',
      channelName: 'channel',
      threadTs: '1700000000.000200',
      messageTs: '1700000000.000201',
      slackUserId: 'U123',
      slackUserName: 'Usuario Uno',
      slackTeamId: 'T123',
    })

    expect(result).toContain('La organización alcanzó el límite de uso')
    expect(generateText).not.toHaveBeenCalled()

    expect(prismaMock.slackThreadMessage.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('La organización alcanzó el límite'),
        }),
      })
    )

    expect(prismaMock.slackIntegrationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slackThreadTs: '1700000000.000200',
          answer: null,
          error: expect.stringContaining('La organización alcanzó el límite'),
        }),
      })
    )
  })

  it('propagates errors after notifying Slack when the AI call fails', async () => {
    prismaMock.slackThread.upsert.mockResolvedValue({
      id: 'thread-1',
      integrationId: 'int-1',
      slackThreadTs: '1700000000.000200',
      slackChannelId: 'C123',
    })
    prismaMock.slackThread.update.mockResolvedValue({})
    prismaMock.slackThreadMessage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    prismaMock.slackThreadMessage.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'user',
        content: 'Seguimos conversando',
        slackMessageTs: '1700000000.000201',
        createdAt: new Date(),
      },
    ])
    prismaMock.slackThreadMessage.create.mockResolvedValue({})
    prismaMock.slackIntegrationLog.create.mockResolvedValue({})

    generateText.mockRejectedValueOnce(new Error('AI down'))

    const integration = {
      id: 'int-1',
      organizationId: 'org-1',
      name: 'Bot',
      description: null,
      slug: 'bot',
      slackTeamId: 'T123',
      slackTeamName: null,
      slackAppId: null,
      slackClientId: null,
      slackClientSecret: null,
      slackSigningSecret: 'signing-secret',
      slackBotToken: 'xoxb-token',
      slackBotUserId: 'Ubot',
      slackBotUserName: 'Guia Bot',
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as unknown as SlackIntegrationWithCategories

    await expect(
      processSlackQuestion(integration, {
        text: 'Seguimos conversando',
        channelId: 'C123',
        channelName: 'channel',
        threadTs: '1700000000.000200',
        messageTs: '1700000000.000201',
        slackUserId: 'U123',
        slackUserName: 'Usuario Uno',
        slackTeamId: 'T123',
      })
    ).rejects.toThrow('AI down')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://slack.com/api/chat.update',
      expect.objectContaining({
        method: 'POST',
      })
    )

    expect(prismaMock.slackThreadMessage.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Tuvimos un problema al procesar tu solicitud'),
        }),
      })
    )

    expect(prismaMock.slackIntegrationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slackThreadTs: '1700000000.000200',
          answer: null,
          error: 'AI down',
        }),
      })
    )

    expect(trackTokenUsage).not.toHaveBeenCalled()
  })
})

describe('verifySlackSignature', () => {
  let timestamp: string
  let body: string
  const signingSecret = 'super-secret'

  beforeEach(() => {
    timestamp = `${Math.floor(Date.now() / 1000)}`
    body = JSON.stringify({ type: 'event_callback' })
  })

  it('returns true for a valid signature', () => {
    const hash = createHmac('sha256', signingSecret)
      .update(`v0:${timestamp}:${body}`)
      .digest('hex')

    const result = verifySlackSignature({
      signingSecret,
      timestamp,
      signature: `v0=${hash}`,
      body,
    })

    expect(result).toBe(true)
  })

})

describe('buildSlackManifest', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://guia.example'
  })

  it('creates a manifest with the expected structure', () => {
    const integration = {
      id: 'integration-1',
      organizationId: 'org-1',
      name: 'Knowledge Bot',
      description: null,
      slug: 'knowledge-bot',
      slackTeamId: null,
      slackTeamName: null,
      slackAppId: null,
      slackClientId: null,
      slackClientSecret: null,
      slackSigningSecret: null,
      slackBotToken: null,
      slackBotUserId: null,
      slackBotUserName: null,
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [
        {
          id: 'link-1',
          integrationId: 'integration-1',
          categoryId: 'category-1',
          createdAt: new Date(),
          category: {
            id: 'category-1',
            name: 'Recursos Humanos',
            description: null,
            color: '#1D4ED8',
            organizationId: 'org-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            sources: [],
            sourceCategories: [],
            groupAccess: [],
            slackIntegrations: [],
            organization: {
              id: 'org-1',
              name: 'Org Test',
              slug: 'org-test',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      ],
    } as unknown as SlackIntegrationWithCategories

    const manifest = buildSlackManifest(integration)

    expect(manifest.display_information.name).toBe('Knowledge Bot')
    expect(
      manifest.settings.event_subscriptions.request_url.startsWith(
        'https://guia.example/api/integrations/slack/events'
      )
    ).toBe(true)
    expect(manifest.oauth_config.scopes.bot).toEqual(
      expect.arrayContaining([
        'app_mentions:read',
        'chat:write',
        'chat:write.public',
        'files:write',
        'commands',
        'users:read',
        'users:read.email',
      ])
    )
  })
})

