import { headers } from "next/headers"

/**
 * Get the current session from the request (server-side only)
 */
export const getSession = async () => {
  const authModule = await import('./auth')
  const session = await authModule.auth.api.getSession({
    headers: await headers(),
  })

  return session
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export const requireAuth = async () => {
  const session = await getSession()

  if (!session) {
    const { redirect } = await import('next/navigation')
    redirect("/login")
  }

  return session
}
