import { describe, expect, it, beforeEach, afterAll, vi, type Mock } from 'vitest'

const actualNextServer = await import('next/server')

vi.mock('next/server', () => ({
  ...actualNextServer,
  after: (task: unknown) => {
    if (typeof task === 'function') {
      const result = (task as () => unknown | Promise<unknown>)()
      return result instanceof Promise ? result : Promise.resolve(result)
    }

    if (task instanceof Promise) {
      return task
    }

    return Promise.resolve(task)
  },
}))

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-key'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

const prismaMock = {
  slackIntegration: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
  slackThread: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/database/prisma-server', () => ({
  prisma: prismaMock,
}))

const { NextRequest } = await import('next/server')
const { getSession } = await import('@/lib/auth/session')
const slackServiceModule = await import('@/lib/integrations/slack/service')
const { POST } = await import('@/app/api/integrations/slack/events/route')

const findSlackIntegrationForEvent = vi.spyOn(slackServiceModule, 'findSlackIntegrationForEvent')
const processSlackQuestion = vi.spyOn(slackServiceModule, 'processSlackQuestion')
const verifySlackSignature = vi.spyOn(slackServiceModule, 'verifySlackSignature')
const mockGetSession = getSession as Mock
const prisma = prismaMock

describe('Slack events endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the challenge for url_verification requests', async () => {
    const request = new NextRequest('http://localhost/api/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify({
        type: 'url_verification',
        challenge: 'challenge-token',
      }),
      headers: new Headers({ 'content-type': 'application/json' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ challenge: 'challenge-token' })
  })

  it('returns 404 when no integration matches even after signature validation', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } } as any)
    findSlackIntegrationForEvent.mockResolvedValue(null)
    verifySlackSignature.mockReturnValue(false)
    prisma.slackIntegration.findMany.mockResolvedValue([
      {
        id: 'int-1',
        slackSigningSecret: 'secret-1',
        isActive: true,
      },
    ])

    const request = new NextRequest('http://localhost/api/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify({
        type: 'event_callback',
        event: { type: 'app_mention', text: 'hola' },
      }),
      headers: new Headers({
        'content-type': 'application/json',
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': `${Math.floor(Date.now() / 1000)}`,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
    expect(prisma.slackIntegration.findMany).toHaveBeenCalled()
  })

  it('dispatches app_mention events to the Slack service', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } } as any)
    verifySlackSignature.mockReturnValue(true)
    findSlackIntegrationForEvent.mockResolvedValue({
      id: 'int-1',
      organizationId: 'org-1',
      name: 'Bot',
      description: null,
      slug: 'bot',
      slackTeamId: null,
      slackTeamName: null,
      slackAppId: null,
      slackClientId: null,
      slackClientSecret: null,
      slackSigningSecret: 'signing-secret',
      slackBotToken: 'xoxb-token',
      slackBotUserId: null,
      slackBotUserName: null,
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as any)
    processSlackQuestion.mockResolvedValue('respuesta')

    const body = {
      type: 'event_callback',
      team_id: 'T123',
      api_app_id: 'A123',
      authorizations: [{ user_id: 'U432', user_name: 'BotName' }],
      event: {
        type: 'app_mention',
        text: '<@bot> Hola',
        user: 'U123',
        channel: 'C123',
        ts: '1700000000.000100',
      },
    }

    const request = new NextRequest('http://localhost/api/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: new Headers({
        'content-type': 'application/json',
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': `${Math.floor(Date.now() / 1000)}`,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(processSlackQuestion).toHaveBeenCalledTimes(1)
    expect(processSlackQuestion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: '<@bot> Hola',
        channelId: 'C123',
        threadTs: '1700000000.000100',
        messageTs: '1700000000.000100',
        slackUserId: 'U123',
      })
    )
    expect(prisma.slackIntegration.update).toHaveBeenCalled()
  })

  it('dispatches message events in tracked threads to the Slack service', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } } as any)
    verifySlackSignature.mockReturnValue(true)
    findSlackIntegrationForEvent.mockResolvedValue({
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
      slackBotUserId: 'U432',
      slackBotUserName: 'BotName',
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as any)
    prisma.slackThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      integrationId: 'int-1',
      slackThreadTs: '1700000000.000200',
    })

    const body = {
      type: 'event_callback',
      team_id: 'T123',
      event: {
        type: 'message',
        text: 'Seguimos conversando',
        user: 'U123',
        channel: 'C123',
        channel_type: 'channel',
        thread_ts: '1700000000.000200',
        ts: '1700000000.000201',
      },
    }

    const request = new NextRequest('http://localhost/api/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: new Headers({
        'content-type': 'application/json',
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': `${Math.floor(Date.now() / 1000)}`,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(processSlackQuestion).toHaveBeenCalledTimes(1)
    expect(processSlackQuestion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: 'Seguimos conversando',
        channelId: 'C123',
        threadTs: '1700000000.000200',
        messageTs: '1700000000.000201',
        slackUserId: 'U123',
      })
    )
  })

  it('ignores message events without a tracked thread', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } } as any)
    verifySlackSignature.mockReturnValue(true)
    findSlackIntegrationForEvent.mockResolvedValue({
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
      slackBotUserId: 'U432',
      slackBotUserName: 'BotName',
      defaultThread: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
    } as any)
    prisma.slackThread.findUnique.mockResolvedValue(null)

    const body = {
      type: 'event_callback',
      team_id: 'T123',
      event: {
        type: 'message',
        text: 'Ping',
        user: 'U123',
        channel: 'C123',
        channel_type: 'channel',
        thread_ts: '1700000000.000300',
        ts: '1700000000.000301',
      },
    }

    const request = new NextRequest('http://localhost/api/integrations/slack/events', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: new Headers({
        'content-type': 'application/json',
        'x-slack-signature': 'v0=signature',
        'x-slack-request-timestamp': `${Math.floor(Date.now() / 1000)}`,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(processSlackQuestion).not.toHaveBeenCalled()
  })
})

afterAll(() => {
  findSlackIntegrationForEvent.mockRestore()
  processSlackQuestion.mockRestore()
  verifySlackSignature.mockRestore()
})

