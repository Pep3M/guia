import { describe, expect, test } from "vitest"
import { calculateAvatarLimitStatus } from "@/lib/account/helpers"

describe("calculateAvatarLimitStatus", () => {
  test("permite subir cuando quedan intentos disponibles", () => {
    const result = calculateAvatarLimitStatus(1, 3)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  test("bloquea cuando se alcanza el límite diario", () => {
    const result = calculateAvatarLimitStatus(3, 3)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test("retorna infinito cuando el límite es cero o negativo", () => {
    const result = calculateAvatarLimitStatus(100, 0)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(Infinity)
  })
})
