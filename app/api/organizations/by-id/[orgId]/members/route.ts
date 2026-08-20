import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Check membership
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
        { error: "No eres miembro de esta organización" },
        { status: 403 }
      )
    }

    // Get all members
    const members = await prisma.membership.findMany({
      where: {
        organizationId: orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json(
      { error: "Error al obtener miembros" },
      { status: 500 }
    )
  }
}

