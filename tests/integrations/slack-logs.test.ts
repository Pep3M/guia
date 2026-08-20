import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest'
import { NextRequest } from 'next/server'

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-key'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/db'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/integrations/slack/auth', () => ({
  ensureOwnerOrAdmin: vi.fn(),
}))

vi.mock('@/lib/database/prisma-server', () => ({
  prisma: {
    $transaction: vi.fn(async (operations: any[]) => Promise.all(operations)),
    slackIntegration: {
      findFirst: vi.fn(),
    },
    slackIntegrationLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

const { getSession } = await import('@/lib/auth/session')
const { ensureOwnerOrAdmin } = await import('@/lib/integrations/slack/auth')
const { prisma } = await import('@/lib/database/prisma-server')
const { GET } = await import('@/app/api/organizations/[orgId]/integrations/slack/[integrationId]/logs/route')

const mockGetSession = getSession as Mock
const mockEnsureOwnerOrAdmin = ensureOwnerOrAdmin as Mock
const mockFindIntegration = prisma.slackIntegration.findFirst as Mock
const mockFindLogs = prisma.slackIntegrationLog.findMany as Mock
const mockCountLogs = prisma.slackIntegrationLog.count as Mock

describe('Slack logs endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when session is missing', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api', {
      method: 'GET',
    })

    const response = await GET(request, {
      params: Promise.resolve({ orgId: 'org-1', integrationId: 'int-1' }),
    })

    expect(response.status).toBe(401)
  })

  it('returns paginated logs with filters', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } } as any)
    mockEnsureOwnerOrAdmin.mockResolvedValue({ role: 'OWNER' } as any)
    mockFindIntegration.mockResolvedValue({ id: 'int-1' } as any)
    mockFindLogs.mockResolvedValue([
      {
        id: 'log-1',
        integrationId: 'int-1',
        organizationId: 'org-1',
        slackTeamId: 'T1',
        slackChannelId: 'C1',
        slackChannel: 'general',
        slackUserId: 'U1',
        slackUserName: 'User One',
        question: '¿Cuál es la política?',
        answer: 'La política se encuentra en...',
        error: null,
        tokensInput: 120,
        tokensOutput: 80,
        responseTimeMs: 1200,
        createdAt: new Date('2024-01-01T12:00:00Z'),
      },
    ])
    mockCountLogs.mockResolvedValue(1)

    const request = new NextRequest(
      'http://localhost/api?from=2024-01-01&to=2024-01-31&page=1&pageSize=10&slackUserId=U1',
      { method: 'GET' }
    )

    const response = await GET(request, {
      params: Promise.resolve({ orgId: 'org-1', integrationId: 'int-1' }),
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.data).toHaveLength(1)
    expect(mockFindLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slackUserId: 'U1',
        }),
      })
    )
  })
})

