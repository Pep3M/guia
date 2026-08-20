#!/usr/bin/env bun

/**
 * Script para generar una clave secreta para Better Auth
 * Uso: bun run scripts/generate-auth-secret.ts
 */

import { randomBytes } from "crypto"

const generateSecret = () => {
  return randomBytes(32).toString("hex")
}

const secret = generateSecret()

console.log("🔐 BETTER_AUTH_SECRET generado:")
console.log(secret)
console.log("\n📋 Copia esta clave y agrégala a tus variables de entorno en Vercel:")
console.log(`BETTER_AUTH_SECRET=${secret}`)
console.log("\n⚠️  IMPORTANTE: Mantén esta clave segura y no la compartas públicamente")
