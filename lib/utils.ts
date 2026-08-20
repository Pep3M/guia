import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Map organization role from English to Spanish
 */
export function translateRole(role: string): string {
  const roleMap: Record<string, string> = {
    OWNER: "Propietario",
    ADMIN: "Administrador",
    MEMBER: "Miembro",
  }
  
  return roleMap[role] || role
}

/**
 * Convierte todos los valores BigInt en un objeto a strings para serialización JSON
 * Esto es necesario porque JSON.stringify no puede serializar BigInt directamente
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === "bigint") {
    return obj.toString() as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt) as unknown as T
  }

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T
  }

  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value)
    }
    return serialized as T
  }

  return obj
}
