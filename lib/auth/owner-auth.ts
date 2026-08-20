import { prisma } from "@/lib/database/prisma-server"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"

/**
 * Verifica si un usuario es OWNER de una organización específica
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @returns true si el usuario es OWNER, false en caso contrario
 */
export const isOwner = async (userId: string, organizationId: string): Promise<boolean> => {
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

  return membership?.role === "OWNER"
}

/**
 * Verifica si el usuario actual es OWNER de una organización
 * Redirige a /organizations si no lo es o no está autenticado
 * @param organizationId - ID de la organización
 * @returns La sesión del usuario si es OWNER
 */
export const requireOwner = async (organizationId: string) => {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const isUserOwner = await isOwner(session.user.id, organizationId)

  if (!isUserOwner) {
    redirect("/organizations")
  }

  return session
}

/**
 * Obtiene todas las organizaciones donde el usuario es OWNER
 * @param userId - ID del usuario
 * @returns Array de organizaciones
 */
export const getOwnerOrganizations = async (userId: string) => {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      role: "OWNER",
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  return memberships.map((m) => m.organization)
}

/**
 * Verifica si el usuario actual en sesión es OWNER de una organización (sin redirect)
 * @param organizationId - ID de la organización
 * @returns true si es OWNER, false en caso contrario
 */
export const checkIsOwner = async (organizationId: string): Promise<boolean> => {
  const session = await getSession()

  if (!session) {
    return false
  }

  return isOwner(session.user.id, organizationId)
}

