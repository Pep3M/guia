import { prisma } from '@/lib/database/prisma-server'
import { getOrganizationUsage, getUserUsage } from './token-tracker'

// En la edición self-hosted los límites son opt-in: si un administrador no ha
// definido OrganizationLimits/UserTokenLimits, no hay cuota que aplicar.
// ponytail: se eliminó el auto-bloqueo por cuota excedida — sin panel de
// super-admin, una organización auto-bloqueada no tendría cómo desbloquearse.
// El bloqueo sigue existiendo pero sólo si un admin lo activa a mano.

const NO_USAGE = {
  daily: { tokens: 0, requests: 0 },
  monthly: { tokens: 0, requests: 0 },
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  usage: {
    daily: { tokens: number; requests: number }
    monthly: { tokens: number; requests: number }
  }
  limits: {
    dailyTokenLimit: number | null
    monthlyTokenLimit: number | null
    dailyRequestLimit: number | null
    monthlyRequestLimit: number | null
    isBlocked: boolean
    blockedReason?: string
  }
}

const UNLIMITED: LimitCheckResult['limits'] = {
  dailyTokenLimit: null,
  monthlyTokenLimit: null,
  dailyRequestLimit: null,
  monthlyRequestLimit: null,
  isBlocked: false,
}

/**
 * Check if an organization can perform an operation based on its configured limits.
 * Organizations without a limits record are unrestricted.
 */
export async function checkLimits(
  organizationId: string,
  estimatedTokens: number = 0
): Promise<LimitCheckResult> {
  try {
    const limits = await prisma.organizationLimits.findUnique({
      where: { organizationId },
    })

    if (!limits) {
      return { allowed: true, usage: NO_USAGE, limits: UNLIMITED }
    }

    const configured: LimitCheckResult['limits'] = {
      dailyTokenLimit: limits.dailyTokenLimit,
      monthlyTokenLimit: limits.monthlyTokenLimit,
      dailyRequestLimit: limits.dailyRequestLimit,
      monthlyRequestLimit: limits.monthlyRequestLimit,
      isBlocked: limits.isBlocked,
      blockedReason: limits.blockedReason || undefined,
    }

    if (limits.isBlocked) {
      return {
        allowed: false,
        reason: limits.blockedReason || 'La organización está bloqueada',
        usage: NO_USAGE,
        limits: configured,
      }
    }

    const [dailyUsage, monthlyUsage] = await Promise.all([
      getOrganizationUsage(organizationId, 'day'),
      getOrganizationUsage(organizationId, 'month'),
    ])

    const usage = {
      daily: { tokens: dailyUsage.tokensTotal, requests: dailyUsage.requestCount },
      monthly: { tokens: monthlyUsage.tokensTotal, requests: monthlyUsage.requestCount },
    }

    const exceeded = ((): string | null => {
      if (
        limits.dailyTokenLimit !== null &&
        dailyUsage.tokensTotal + estimatedTokens > limits.dailyTokenLimit
      ) {
        return `Límite diario de tokens alcanzado (${dailyUsage.tokensTotal.toLocaleString()}/${limits.dailyTokenLimit.toLocaleString()})`
      }
      if (
        limits.monthlyTokenLimit !== null &&
        monthlyUsage.tokensTotal + estimatedTokens > limits.monthlyTokenLimit
      ) {
        return `Límite mensual de tokens alcanzado (${monthlyUsage.tokensTotal.toLocaleString()}/${limits.monthlyTokenLimit.toLocaleString()})`
      }
      if (
        limits.dailyRequestLimit !== null &&
        dailyUsage.requestCount >= limits.dailyRequestLimit
      ) {
        return `Límite diario de peticiones alcanzado (${dailyUsage.requestCount.toLocaleString()}/${limits.dailyRequestLimit.toLocaleString()})`
      }
      if (
        limits.monthlyRequestLimit !== null &&
        monthlyUsage.requestCount >= limits.monthlyRequestLimit
      ) {
        return `Límite mensual de peticiones alcanzado (${monthlyUsage.requestCount.toLocaleString()}/${limits.monthlyRequestLimit.toLocaleString()})`
      }
      return null
    })()

    if (exceeded) {
      return { allowed: false, reason: exceeded, usage, limits: configured }
    }

    return { allowed: true, usage, limits: configured }
  } catch (error) {
    console.error('[LIMIT-VALIDATOR] Error checking limits:', error)
    // Ante un fallo de la consulta se permite la operación: en self-hosted es
    // preferible seguir sirviendo a caer por un contador.
    return {
      allowed: true,
      reason: 'Error checking limits - allowing operation',
      usage: NO_USAGE,
      limits: UNLIMITED,
    }
  }
}

export interface UserLimitCheckResult {
  allowed: boolean
  reason?: string
  usage: {
    daily: { tokens: number; requests: number }
    monthly: { tokens: number; requests: number }
  }
  limits: {
    dailyTokenLimit: number | null // null = sin límite (hereda del límite de la organización)
    monthlyTokenLimit: number | null // null = sin límite (hereda del límite de la organización)
  }
}

/**
 * Check if a user can perform an operation based on their personal limits.
 */
export async function checkUserLimits(
  organizationId: string,
  userId: string,
  estimatedTokens: number = 0
): Promise<UserLimitCheckResult> {
  const unlimited: UserLimitCheckResult = {
    allowed: true,
    usage: NO_USAGE,
    limits: { dailyTokenLimit: null, monthlyTokenLimit: null },
  }

  try {
    const userLimits = await prisma.userTokenLimits.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })

    if (!userLimits || (!userLimits.dailyTokenLimit && !userLimits.monthlyTokenLimit)) {
      return unlimited
    }

    const [dailyUsage, monthlyUsage] = await Promise.all([
      getUserUsage(organizationId, userId, 'day'),
      getUserUsage(organizationId, userId, 'month'),
    ])

    const usage = {
      daily: { tokens: dailyUsage.tokensTotal, requests: dailyUsage.requestCount },
      monthly: { tokens: monthlyUsage.tokensTotal, requests: monthlyUsage.requestCount },
    }
    const limits = {
      dailyTokenLimit: userLimits.dailyTokenLimit,
      monthlyTokenLimit: userLimits.monthlyTokenLimit,
    }

    if (
      userLimits.dailyTokenLimit !== null &&
      dailyUsage.tokensTotal + estimatedTokens > userLimits.dailyTokenLimit
    ) {
      return {
        allowed: false,
        reason: 'Has alcanzado tu límite diario de tokens. Contacta al administrador de la organización para aumentarlo.',
        usage,
        limits,
      }
    }

    if (
      userLimits.monthlyTokenLimit !== null &&
      monthlyUsage.tokensTotal + estimatedTokens > userLimits.monthlyTokenLimit
    ) {
      return {
        allowed: false,
        reason: `Has alcanzado tu límite mensual de tokens (${monthlyUsage.tokensTotal.toLocaleString()}/${userLimits.monthlyTokenLimit.toLocaleString()}). Contacta al administrador de la organización para aumentarlo.`,
        usage,
        limits,
      }
    }

    return { allowed: true, usage, limits }
  } catch (error) {
    console.error('[USER-LIMIT-VALIDATOR] Error checking user limits:', error)
    return { ...unlimited, reason: 'Error checking user limits - allowing operation' }
  }
}
