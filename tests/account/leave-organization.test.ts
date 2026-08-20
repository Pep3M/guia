import { describe, expect, test } from "vitest"
import { canLeaveOrganization } from "@/lib/account/helpers"

describe("canLeaveOrganization", () => {
  test("permite que un miembro abandone la organización", () => {
    const result = canLeaveOrganization("MEMBER", 2)

    expect(result.allowed).toBe(true)
  })

  test("permite que un owner abandone si hay otros owners", () => {
    const result = canLeaveOrganization("OWNER", 2)

    expect(result.allowed).toBe(true)
  })

  test("bloquea al último owner de la organización", () => {
    const result = canLeaveOrganization("OWNER", 1)

    expect(result.allowed).toBe(false)
    expect(result.reason).toBe("Debes asignar otro propietario antes de abandonar la organización.")
  })
})
