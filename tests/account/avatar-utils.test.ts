import { describe, expect, test } from "vitest"
import {
  buildAvatarBlobPath,
  getDailyAvatarUploadLimit,
  getMaxAvatarSizeBytes,
  isManagedAvatarUrl,
  validateAvatarFile,
} from "@/lib/account/avatar"

describe("avatar utils", () => {
  test("validateAvatarFile permite imágenes válidas", () => {
    const result = validateAvatarFile({
      size: 500 * 1024,
      type: "image/png",
      name: "avatar.png",
    })

    expect(result.valid).toBe(true)
  })

  test("validateAvatarFile rechaza tipos no soportados", () => {
    const result = validateAvatarFile({
      size: 1000,
      type: "image/svg+xml",
      name: "avatar.svg",
    })

    expect(result).toEqual({
      valid: false,
      error: expect.objectContaining({ code: "INVALID_TYPE" }),
    })
  })

  test("getDailyAvatarUploadLimit usa valores por defecto cuando la env es inválida", () => {
    expect(getDailyAvatarUploadLimit("abc" as any)).toBe(3)
    expect(getDailyAvatarUploadLimit("-5" as any)).toBe(3)
  })

  test("getMaxAvatarSizeBytes usa fallback cuando el valor es inválido", () => {
    expect(getMaxAvatarSizeBytes("abc" as any)).toBe(2 * 1024 * 1024)
    expect(getMaxAvatarSizeBytes("-10" as any)).toBe(2 * 1024 * 1024)
  })

  test("buildAvatarBlobPath genera rutas seguras y únicas", () => {
    const pathA = buildAvatarBlobPath("user-1", "Mi ávatar.png")
    const pathB = buildAvatarBlobPath("user-1", "Mi ávatar.png")

    expect(pathA).toMatch(/^avatars\/user-1\//)
    expect(pathA).not.toBe(pathB)
    expect(pathA).toMatch(/\.png$/)
    expect(pathA).not.toMatch(/\s/)
  })

  test("isManagedAvatarUrl detecta URLs gestionadas por el almacenamiento", () => {
    expect(isManagedAvatarUrl("/api/files/avatars/user-1.png")).toBe(true)
    expect(isManagedAvatarUrl("https://test.blob.vercel-storage.com/avatar.png")).toBe(true)
    expect(isManagedAvatarUrl("https://example.com/avatar.png")).toBe(false)
    expect(isManagedAvatarUrl(undefined)).toBe(false)
  })
})
