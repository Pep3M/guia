import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the prisma module
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockAggregate = vi.fn()

vi.mock('@/lib/database/prisma-server', () => ({
  prisma: {
    organizationLimits: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    tokenUsage: {
      aggregate: mockAggregate,
    },
  },
}))

// Import after mocking
const { checkLimits } = await import('@/lib/ai/limit-validator')

const mockOrganizationId = 'org-123'

const limitsRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'limit-1',
  organizationId: mockOrganizationId,
  dailyTokenLimit: 1_000_000,
  monthlyTokenLimit: 5_000_000,
  dailyRequestLimit: 10_000,
  monthlyRequestLimit: 100_000,
  isBlocked: false,
  blockedReason: null,
  blockedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  updatedBy: null,
  ...overrides,
})

const usage = (tokens: number, requests: number) => ({
  _sum: { tokensTotal: tokens, costUSD: 0 },
  _count: { id: requests },
  _avg: {},
  _max: {},
  _min: {},
})

describe('Limit Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkLimits', () => {
    test('permite y no crea nada cuando la organización no tiene cuotas configuradas', async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await checkLimits(mockOrganizationId, 1000)

      expect(result.allowed).toBe(true)
      expect(result.limits.dailyTokenLimit).toBeNull()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    test('permite cuando el uso está por debajo de las cuotas', async () => {
      mockFindUnique.mockResolvedValue(limitsRecord())
      mockAggregate.mockResolvedValue(usage(100_000, 100))

      const result = await checkLimits(mockOrganizationId, 1000)

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.usage.daily.tokens).toBe(100_000)
      expect(result.limits.isBlocked).toBe(false)
    })

    test('permite cuando el registro existe pero todas las cuotas son nulas', async () => {
      mockFindUnique.mockResolvedValue(
        limitsRecord({
          dailyTokenLimit: null,
          monthlyTokenLimit: null,
          dailyRequestLimit: null,
          monthlyRequestLimit: null,
        })
      )
      mockAggregate.mockResolvedValue(usage(50_000_000, 999_999))

      const result = await checkLimits(mockOrganizationId, 1_000_000)

      expect(result.allowed).toBe(true)
    })

    test('deniega cuando la organización está bloqueada a mano', async () => {
      mockFindUnique.mockResolvedValue(
        limitsRecord({
          isBlocked: true,
          blockedReason: 'Bloqueada por el administrador',
          blockedAt: new Date(),
          updatedBy: 'admin-1',
        })
      )

      const result = await checkLimits(mockOrganizationId, 1000)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Bloqueada por el administrador')
      expect(result.limits.isBlocked).toBe(true)
    })

    test('deniega al superar el límite diario de tokens sin bloquear la organización', async () => {
      mockFindUnique.mockResolvedValue(limitsRecord())
      mockAggregate
        .mockResolvedValueOnce(usage(999_000, 500))
        .mockResolvedValueOnce(usage(1_000_000, 1000))

      const result = await checkLimits(mockOrganizationId, 2000)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Límite diario de tokens')
      // El auto-bloqueo se eliminó: una organización sin panel de super-admin
      // no tendría cómo desbloquearse.
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    test('deniega al superar el límite diario de peticiones', async () => {
      mockFindUnique.mockResolvedValue(limitsRecord())
      mockAggregate
        .mockResolvedValueOnce(usage(1000, 10_000))
        .mockResolvedValueOnce(usage(2000, 20_000))

      const result = await checkLimits(mockOrganizationId, 10)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Límite diario de peticiones')
    })

    test('permite la operación si la consulta de cuotas falla', async () => {
      mockFindUnique.mockRejectedValue(new Error('database down'))

      const result = await checkLimits(mockOrganizationId, 1000)

      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('Error checking limits')
    })
  })
})
