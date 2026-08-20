import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from "@/lib/auth/session"
import { canLeaveOrganization, OrganizationRole } from "@/lib/account/helpers"

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { orgId } = await params

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "No perteneces a esta organización" },
        { status: 404 },
      )
    }

    const ownersCount = await prisma.membership.count({
      where: {
        organizationId: orgId,
        role: "OWNER",
      },
    })

    const leaveStatus = canLeaveOrganization(membership.role as OrganizationRole, ownersCount)

    if (!leaveStatus.allowed) {
      return NextResponse.json(
        { error: leaveStatus.reason ?? "No puedes abandonar la organización." },
        { status: 400 },
      )
    }

    await prisma.membership.delete({
      where: { id: membership.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ACCOUNT][LEAVE_ORG] Error al abandonar organización:", error)
    return NextResponse.json(
      { error: "No fue posible abandonar la organización." },
      { status: 500 },
    )
  }
}
