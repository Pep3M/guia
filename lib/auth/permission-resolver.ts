import { prisma } from "@/lib/database/prisma-server"

type PermissionType = "canUploadDocuments" | "canCreateConversations" | "canInviteUsers"

/**
 * Resuelve el permiso de un usuario considerando tanto los permisos globales
 * como los permisos específicos de la organización.
 * 
 * Lógica de prioridad (de mayor a menor):
 * 1. Si el permiso global de la instancia es false, SIEMPRE false
 * 2. Si existe override en OrganizationUserPermissions, usar ese valor (solo si el global no está restringido)
 * 3. Si no hay override y el permiso global es true:
 *    - Si el usuario es OWNER o ADMIN: tiene permiso (heredado del global)
 *    - Si el usuario es MEMBER: NO tiene permiso por defecto (necesita override explícito)
 * 
 * Nota: Por defecto, los MEMBERS solo tienen acceso al chat. Todos los demás permisos
 * deben ser otorgados explícitamente por el owner de la organización.
 * 
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @param permission - Tipo de permiso a verificar
 * @returns true si el usuario tiene el permiso, false en caso contrario
 */
export async function resolveUserPermission(
  userId: string,
  organizationId: string,
  permission: PermissionType
): Promise<boolean> {
  try {
    // Obtener el usuario y su membresía en la organización
    const [user, membership] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          canUploadDocuments: true,
          canCreateConversations: true,
          canInviteUsers: true,
        },
      }),
      prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        select: {
          role: true,
        },
      }),
    ])

    if (!user || !membership) return false

    const globalPermission = user[permission] ?? false

    // 1. Si el permiso global está restringido (false), no importa lo que diga la org
    if (!globalPermission) {
      return false
    }

    // 2. Si el permiso global es true, verificar si hay override en la org
    const orgPermission = await prisma.organizationUserPermissions.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        [permission]: true,
      },
    })

    // Si existe override en la org (no null), usar ese valor
    if (orgPermission && orgPermission[permission] !== null) {
      return orgPermission[permission] === true
    }

    // 3. Si no hay override y el permiso global es true:
    //    - OWNER y ADMIN heredan el permiso del global
    //    - MEMBER NO tiene permiso por defecto (necesita override explícito)
    if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
      return true // Heredan del permiso global
    }

    // MEMBER no tiene permisos por defecto (excepto chat)
    return false
  } catch (error) {
    console.error(`[PERMISSION-RESOLVER] Error resolving permission ${permission}:`, error)
    // En caso de error, ser conservador y denegar el permiso
    return false
  }
}

/**
 * Obtiene todos los permisos resueltos de un usuario en una organización
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @returns Objeto con todos los permisos resueltos
 */
export async function resolveAllUserPermissions(
  userId: string,
  organizationId: string
): Promise<{
  canUploadDocuments: boolean
  canCreateConversations: boolean
  canInviteUsers: boolean
  source: {
    canUploadDocuments: "global" | "organization"
    canCreateConversations: "global" | "organization"
    canInviteUsers: "global" | "organization"
  }
}> {
  const [canUploadDocuments, canCreateConversations, canInviteUsers] = await Promise.all([
    resolveUserPermission(userId, organizationId, "canUploadDocuments"),
    resolveUserPermission(userId, organizationId, "canCreateConversations"),
    resolveUserPermission(userId, organizationId, "canInviteUsers"),
  ])

  // Determinar la fuente de cada permiso
  const orgPermission = await prisma.organizationUserPermissions.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: {
      canUploadDocuments: true,
      canCreateConversations: true,
      canInviteUsers: true,
    },
  })

  return {
    canUploadDocuments,
    canCreateConversations,
    canInviteUsers,
    source: {
      canUploadDocuments:
        orgPermission?.canUploadDocuments !== null ? "organization" : "global",
      canCreateConversations:
        orgPermission?.canCreateConversations !== null ? "organization" : "global",
      canInviteUsers:
        orgPermission?.canInviteUsers !== null ? "organization" : "global",
    },
  }
}

