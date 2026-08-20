import { Membership } from "@prisma/client"

export type Role = "OWNER" | "ADMIN" | "MEMBER"
export type Action = "read" | "write" | "delete" | "admin" | "invite"

// Role hierarchy: OWNER > ADMIN > MEMBER
const roleHierarchy: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
}

// Define permissions for each role
const rolePermissions: Record<Role, Action[]> = {
  OWNER: ["read", "write", "delete", "admin", "invite"],
  ADMIN: ["read", "write", "delete", "invite"],
  MEMBER: ["read", "write"],
}

/**
 * Check if a membership has permission to perform an action
 */
export const can = (
  membership: Pick<Membership, "role"> | null,
  action: Action
): boolean => {
  if (!membership) return false

  const role = membership.role as Role
  const permissions = rolePermissions[role]

  return permissions?.includes(action) ?? false
}

/**
 * Check if a role has higher or equal hierarchy than another role
 */
export const hasRoleHierarchy = (
  currentRole: string,
  targetRole: string
): boolean => {
  const current = roleHierarchy[currentRole as Role] ?? 0
  const target = roleHierarchy[targetRole as Role] ?? 0

  return current >= target
}

/**
 * Get all available roles
 */
export const getAllRoles = (): Role[] => {
  return Object.keys(roleHierarchy) as Role[]
}

/**
 * Get roles that a user can assign (roles lower in hierarchy)
 */
export const getAssignableRoles = (currentRole: string): Role[] => {
  const currentLevel = roleHierarchy[currentRole as Role] ?? 0

  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([role]) => role as Role)
}

