import { LOCAL_URL_PREFIX } from "@/lib/storage"

import { randomBytes } from "crypto"

const DEFAULT_DAILY_LIMIT = 3
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

export type AvatarValidationCode = "EMPTY_FILE" | "INVALID_TYPE" | "FILE_TOO_LARGE"

export interface AvatarValidationError {
  code: AvatarValidationCode
  message: string
}

export interface AvatarValidationInput {
  size: number
  type: string | null | undefined
  name?: string | null
}

export type AvatarValidationResult =
  | { valid: true }
  | {
    valid: false
    error: AvatarValidationError
  }

export const getDailyAvatarUploadLimit = (envLimit = process.env.AVATAR_UPLOAD_DAILY_LIMIT): number => {
  if (!envLimit) {
    return DEFAULT_DAILY_LIMIT
  }

  const parsed = Number(envLimit)

  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_DAILY_LIMIT
  }

  return Math.floor(parsed)
}

export const getMaxAvatarSizeBytes = (envSize = process.env.AVATAR_MAX_SIZE_BYTES): number => {
  if (!envSize) {
    return DEFAULT_MAX_SIZE_BYTES
  }

  const parsed = Number(envSize)

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_SIZE_BYTES
  }

  return Math.floor(parsed)
}

export const getStartOfUtcDay = (inputDate = new Date()): Date => {
  const start = new Date(Date.UTC(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth(),
    inputDate.getUTCDate(),
    0,
    0,
    0,
    0,
  ))

  return start
}

export const isMimeTypeAllowed = (mimeType: string | null | undefined): boolean => {
  if (!mimeType) {
    return false
  }

  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())
}

export const validateAvatarFile = (
  file: AvatarValidationInput,
  options?: {
    maxSizeBytes?: number
    allowedMimeTypes?: string[]
  },
): AvatarValidationResult => {
  if (!file || typeof file.size !== "number" || file.size <= 0) {
    return {
      valid: false,
      error: {
        code: "EMPTY_FILE",
        message: "No se recibió un archivo válido.",
      },
    }
  }

  const maxSize = options?.maxSizeBytes ?? getMaxAvatarSizeBytes()
  const allowedTypes = options?.allowedMimeTypes ?? ALLOWED_MIME_TYPES

  if (!file.type || !allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: {
        code: "INVALID_TYPE",
        message: "Tipo de archivo no soportado. Usa PNG, JPG, WebP o GIF.",
      },
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `El archivo es muy grande. Máximo permitido ${(maxSize / (1024 * 1024)).toFixed(1)} MB.`,
      },
    }
  }

  return { valid: true }
}

export interface AvatarLimitStatus {
  allowed: boolean
  remaining: number
}

export const calculateAvatarLimitStatus = (uploadsToday: number, dailyLimit: number): AvatarLimitStatus => {
  if (dailyLimit <= 0) {
    return {
      allowed: true,
      remaining: Infinity,
    }
  }

  const remaining = Math.max(dailyLimit - uploadsToday, 0)

  return {
    allowed: remaining > 0,
    remaining,
  }
}

const removeAccents = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const sanitizeFilename = (filename: string): string => {
  const nameWithoutAccents = removeAccents(filename)
  return nameWithoutAccents
    .replace(/[^A-Za-z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export const buildAvatarBlobPath = (userId: string, originalName?: string | null): string => {
  const safeName = sanitizeFilename(originalName || "avatar.png")
  const randomSuffix = randomBytes(4).toString("hex")
  return `avatars/${userId}/${Date.now()}-${randomSuffix}-${safeName}`
}

/** ¿La URL apunta a un archivo gestionado por nuestro almacenamiento (y por tanto borrable)? */
export const isManagedAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url) {
    return false
  }

  if (url.startsWith(LOCAL_URL_PREFIX)) {
    return true
  }

  try {
    const parsed = new URL(url)
    return parsed.hostname.endsWith(".blob.vercel-storage.com")
  } catch {
    return false
  }
}

