export { calculateAvatarLimitStatus } from "./avatar"

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER"

export interface LeaveOrganizationResult {
  allowed: boolean
  reason?: string
}

export const canLeaveOrganization = (
  role: OrganizationRole,
  ownerCount: number,
): LeaveOrganizationResult => {
  if (ownerCount <= 0) {
    return {
      allowed: true,
    }
  }

  if (role !== "OWNER") {
    return {
      allowed: true,
    }
  }

  if (ownerCount > 1) {
    return {
      allowed: true,
    }
  }

  return {
    allowed: false,
    reason: "Debes asignar otro propietario antes de abandonar la organización.",
  }
}
