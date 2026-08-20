import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from '@/lib/auth/session'
import { canUser, checkRoleHierarchy } from "@/lib/auth/auth-server"
import { z } from "zod"

const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
})

interface RouteParams {
  params: Promise<{ orgId: string; memberId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Check if user has admin permission
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    })

    if (!userMembership || !await canUser(session.user.id, orgId, "admin")) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar roles" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    // Get target membership
    const targetMembership = await prisma.membership.findUnique({
      where: { id: memberId },
    })

    if (!targetMembership || targetMembership.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      )
    }

    // Cannot modify your own role
    if (targetMembership.userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes modificar tu propio rol" },
        { status: 400 }
      )
    }

    // Check role hierarchy
    if (!await checkRoleHierarchy(userMembership.role, validatedData.role)) {
      return NextResponse.json(
        { error: "No puedes asignar un rol superior al tuyo" },
        { status: 403 }
      )
    }

    // Update role
    const updated = await prisma.membership.update({
      where: { id: memberId },
      data: { role: validatedData.role },
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
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating member:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al actualizar miembro" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, memberId } = await params
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Check if user has admin permission
    const userMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: orgId,
        },
      },
    })

    if (!userMembership || !await canUser(session.user.id, orgId, "admin")) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar miembros" },
        { status: 403 }
      )
    }

    // Get target membership
    const targetMembership = await prisma.membership.findUnique({
      where: { id: memberId },
    })

    if (!targetMembership || targetMembership.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Miembro no encontrado" },
        { status: 404 }
      )
    }

    // Cannot remove yourself
    if (targetMembership.userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      )
    }

    // Cannot remove owner
    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "No puedes eliminar al propietario" },
        { status: 400 }
      )
    }

    // Delete membership
    await prisma.membership.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json(
      { error: "Error al eliminar miembro" },
      { status: 500 }
    )
  }
}

