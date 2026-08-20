import { prisma } from '@/lib/database/prisma-server'
import { SupportedModel } from './token-calculator'

export interface TrackTokenUsageParams {
  organizationId: string
  userId: string
  operation: 'embedding' | 'chat'
  tokensInput: number
  tokensOutput: number
  model: SupportedModel
  costUSD: number
}

export interface UsageSummary {
  tokensTotal: number
  costTotal: number
  requestCount: number
}

/**
 * Track token usage in the database
 * @param params - Token usage parameters
 */
export async function trackTokenUsage(params: TrackTokenUsageParams): Promise<void> {
  const { organizationId, userId, operation, tokensInput, tokensOutput, model, costUSD } = params
  
  const tokensTotal = tokensInput + tokensOutput
  
  try {
    await prisma.tokenUsage.create({
      data: {
        organizationId,
        userId,
        operation,
        tokensInput,
        tokensOutput,
        tokensTotal,
        costUSD,
        model,
      },
    })
    
    console.log(`[TOKEN-TRACKER] Tracked ${tokensTotal} tokens (${operation}) for org ${organizationId}`)
  } catch (error) {
    console.error('[TOKEN-TRACKER] Error tracking token usage:', error)
    // Don't throw - we don't want to fail the request if tracking fails
  }
}

/**
 * Get organization usage for a specific period
 * @param organizationId - Organization ID
 * @param period - Time period ('day' or 'month')
 * @returns Usage summary
 */
export async function getOrganizationUsage(
  organizationId: string,
  period: 'day' | 'month'
): Promise<UsageSummary> {
  const now = new Date()
  const startDate = new Date()
  
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }
  
  try {
    const result = await prisma.tokenUsage.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        tokensTotal: true,
        costUSD: true,
      },
      _count: {
        id: true,
      },
    })
    
    return {
      tokensTotal: result._sum.tokensTotal || 0,
      costTotal: result._sum.costUSD || 0,
      requestCount: result._count.id || 0,
    }
  } catch (error) {
    console.error(`[TOKEN-TRACKER] Error getting ${period} usage:`, error)
    return {
      tokensTotal: 0,
      costTotal: 0,
      requestCount: 0,
    }
  }
}

/**
 * Get usage breakdown by user within an organization
 * @param organizationId - Organization ID
 * @param period - Time period ('day' or 'month')
 * @returns Array of user usage summaries
 */
export async function getUserUsageBreakdown(
  organizationId: string,
  period: 'day' | 'month'
): Promise<Array<{ userId: string } & UsageSummary>> {
  const now = new Date()
  const startDate = new Date()
  
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }
  
  try {
    const results = await prisma.tokenUsage.groupBy({
      by: ['userId'],
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        tokensTotal: true,
        costUSD: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          tokensTotal: 'desc',
        },
      },
    })
    
    return results.map((result) => ({
      userId: result.userId,
      tokensTotal: result._sum.tokensTotal || 0,
      costTotal: result._sum.costUSD || 0,
      requestCount: result._count.id || 0,
    }))
  } catch (error) {
    console.error('[TOKEN-TRACKER] Error getting user breakdown:', error)
    return []
  }
}

/**
 * Get user usage for a specific period within an organization
 * @param organizationId - Organization ID
 * @param userId - User ID
 * @param period - Time period ('day' or 'month')
 * @returns Usage summary
 */
export async function getUserUsage(
  organizationId: string,
  userId: string,
  period: 'day' | 'month'
): Promise<UsageSummary> {
  const now = new Date()
  const startDate = new Date()
  
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }
  
  try {
    const result = await prisma.tokenUsage.aggregate({
      where: {
        organizationId,
        userId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        tokensTotal: true,
        costUSD: true,
      },
      _count: {
        id: true,
      },
    })
    
    return {
      tokensTotal: result._sum.tokensTotal || 0,
      costTotal: result._sum.costUSD || 0,
      requestCount: result._count.id || 0,
    }
  } catch (error) {
    console.error(`[TOKEN-TRACKER] Error getting user ${period} usage:`, error)
    return {
      tokensTotal: 0,
      costTotal: 0,
      requestCount: 0,
    }
  }
}

/**
 * Get global usage statistics
 * @param period - Time period ('day' or 'month')
 * @returns Global usage summary
 */
export async function getGlobalUsage(period: 'day' | 'month'): Promise<UsageSummary> {
  const now = new Date()
  const startDate = new Date()
  
  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }
  
  try {
    const result = await prisma.tokenUsage.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      _sum: {
        tokensTotal: true,
        costUSD: true,
      },
      _count: {
        id: true,
      },
    })
    
    return {
      tokensTotal: result._sum.tokensTotal || 0,
      costTotal: result._sum.costUSD || 0,
      requestCount: result._count.id || 0,
    }
  } catch (error) {
    console.error('[TOKEN-TRACKER] Error getting global usage:', error)
    return {
      tokensTotal: 0,
      costTotal: 0,
      requestCount: 0,
    }
  }
}

