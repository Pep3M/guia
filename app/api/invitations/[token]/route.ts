import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Esta invitación ya fue aceptada" },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      )
    }

    return NextResponse.json(invitation)
  } catch (error) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json(
      { error: "Error al obtener la invitación" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "Esta invitación ya fue aceptada" },
        { status: 400 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Esta invitación ha expirado" },
        { status: 400 }
      )
    }

    // Check if user's email matches the invitation
    if (invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "Esta invitación no es para tu email" },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json({
        membership: existingMembership,
        organization: invitation.organization,
        alreadyMember: true,
      })
    }

    // Accept invitation
    const result = await prisma.$transaction([
      // Create membership
      prisma.membership.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      // Mark invitation as accepted
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      membership: result[0],
      organization: invitation.organization,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Error al aceptar la invitación" },
      { status: 500 }
    )
  }
}

