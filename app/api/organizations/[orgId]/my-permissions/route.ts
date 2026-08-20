import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from "@/lib/auth/session"
import { resolveAllUserPermissions } from "@/lib/auth/permission-resolver"

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { orgId } = await params

    // Verify user is member of organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
      select: {
        role: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "No eres miembro de esta organización" },
        { status: 403 }
      )
    }

    // Get resolved permissions for current user
    const resolvedPermissions = await resolveAllUserPermissions(
      session.user.id,
      orgId
    )

    return NextResponse.json({
      role: membership.role,
      permissions: resolvedPermissions,
    })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}

