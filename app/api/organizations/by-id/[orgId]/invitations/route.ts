import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from '@/lib/auth/session'
import { resolveUserPermission } from "@/lib/auth/permission-resolver"
import { z } from "zod"
import crypto from "crypto"
import { sendInvitationEmail } from "@/lib/email/email"

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["ADMIN", "MEMBER"]),
})

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await params
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Check if user is member of organization
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

    // Check user permissions using permission resolver (considers superadmin restrictions, org overrides, and role)
    const canInvite = await resolveUserPermission(
      session.user.id,
      orgId,
      "canInviteUsers"
    )

    if (!canInvite) {
      return NextResponse.json(
        { error: "No tienes permisos para invitar usuarios" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = inviteSchema.parse(body)

    // Check if user is already a member
    const existingMember = await prisma.membership.findFirst({
      where: {
        organizationId: orgId,
        user: {
          email: validatedData.email,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "Este usuario ya es miembro de la organización" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email: validatedData.email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Ya existe una invitación pendiente para este email" },
        { status: 400 }
      )
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email: validatedData.email,
        role: validatedData.role,
        token,
        organizationId: orgId,
        invitedBy: session.user.id,
        expiresAt,
      },
      include: {
        organization: true,
      },
    })

    // Send email with invitation link
    try {
      await sendInvitationEmail(
        validatedData.email,
        token,
        invitation.organization.name,
        session.user.name || "Un administrador"
      )
    } catch (emailError) {
      console.error("Error enviando email de invitación:", emailError)
      // Don't fail the request if email sending fails
      // The invitation was created successfully in the database
    }

    return NextResponse.json({
      ...invitation,
      emailSent: true,
    })
  } catch (error) {
    console.error("Error creating invitation:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al crear la invitación" },
      { status: 500 }
    )
  }
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

    // Get pending invitations
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: orgId,
        acceptedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations)
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json(
      { error: "Error al obtener invitaciones" },
      { status: 500 }
    )
  }
}

