import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/organizations", "/invite", "/welcome"]

// API routes that don't require authentication  
const publicApiRoutes = [
  "/api/auth",
  "/api/invitations",
  "/api/public",
  "/api/integrations/slack/events",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next()
  }

  // Allow public API routes (like auth endpoints)
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for session cookie (lightweight check for Edge Runtime)
  // In production, Better Auth uses __Secure- prefix for secure cookies
  const sessionCookie = request.cookies.get("__Secure-guia.session_token") || 
                       request.cookies.get("guia.session_token")
  
  // If no session cookie, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Super Admin verification happens in app/admin/layout.tsx (Node.js runtime)
  // This keeps the middleware lightweight and Edge-compatible
  // The layout uses requireSuperAdmin() which properly validates the user role
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (auth endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

