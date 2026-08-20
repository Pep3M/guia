import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prismaEdge } from '@/lib/database/prisma-server'

// Validate required environment variables
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not defined. Please add it to your .env.local file."
  )
}

if (!process.env.BETTER_AUTH_URL && !process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error(
    "BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL is not defined. Please add it to your .env.local file."
  )
}

export const auth = betterAuth({
  database: prismaAdapter(prismaEdge, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (session extends after this period)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    cookieCacheOverhead: 60, // 1 minute
  },
  advanced: {
    cookiePrefix: "guia",
    generateId: () => {
      // Use Web Crypto API (compatible with Edge Runtime)
      return globalThis.crypto.randomUUID()
    },
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : [],
})

export type Session = typeof auth.$Infer.Session

