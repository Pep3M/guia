import { prisma } from '@/lib/database/prisma-server'

export const ensureMembership = (userId: string, organizationId: string) =>
  prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  })

export const ensureOwnerOrAdmin = async (userId: string, organizationId: string) => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      role: true,
    },
  })

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return null
  }

  return membership
}

