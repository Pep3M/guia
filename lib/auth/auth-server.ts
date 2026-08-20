import { prisma } from '@/lib/database/prisma-server'
import { redirect } from "next/navigation"

/**
 * Get user with all their memberships
 */
export const getUserWithMemberships = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  })
}

/**
 * Get user's membership in a specific organization
 */
export const getMembership = async (userId: string, organizationId: string) => {
  return prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
      user: true,
    },
  })
}

/**
 * Require membership in an organization
 */
export const requireMembership = async (
  userId: string,
  organizationId: string
) => {
  const membership = await getMembership(userId, organizationId)

  if (!membership) {
    redirect("/organizations")
  }

  return membership
}

/**
 * Get organization by slug
 */
export const getOrganizationBySlug = async (slug: string) => {
  return prisma.organization.findUnique({
    where: { slug },
  })
}

/**
 * Validates user access to an organization
 */
export const validateUserAccess = async (userId: string, organizationId: string) => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  })

  return {
    hasAccess: !!membership,
    membership,
  }
}

/**
 * Validates request for chat API
 */
export const validateChatRequest = async (session: any, organizationId: string) => {
  if (!organizationId) {
    return { isValid: false, error: 'Organization ID is required', status: 400 }
  }

  const { hasAccess } = await validateUserAccess(session.user.id, organizationId)
  
  if (!hasAccess) {
    return { isValid: false, error: 'No tienes acceso a esta organización', status: 403 }
  }

  return { isValid: true }
}

/**
 * Get auth instance for server-side operations
 */
export const getAuthInstance = async () => {
  const authModule = await import('./auth')
  return authModule.auth
}

/**
 * Check if user can perform action (wrapper for can function)
 */
export const canUser = async (userId: string, organizationId: string, action: string) => {
  const { can } = await import('./rbac')
  const membership = await getMembership(userId, organizationId)
  return can(membership, action as any)
}

/**
 * Check role hierarchy (wrapper for hasRoleHierarchy function)
 */
export const checkRoleHierarchy = async (userRole: string, targetRole: string) => {
  const { hasRoleHierarchy } = await import('./rbac')
  return hasRoleHierarchy(userRole, targetRole)
}
