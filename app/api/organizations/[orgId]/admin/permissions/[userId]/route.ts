import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { isOwner } from "@/lib/auth/owner-auth"
import { prisma } from "@/lib/database/prisma-server"
import { resolveAllUserPermissions } from "@/lib/auth/permission-resolver"
import { z } from "zod"

const updatePermissionsSchema = z.object({
  canUploadDocuments: z.boolean().nullable().optional(),
  canCreateConversations: z.boolean().nullable().optional(),
  canInviteUsers: z.boolean().nullable().optional(),
})

interface RouteParams {
  params: Promise<{ orgId: string; userId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { orgId, userId } = await params

    // Verify user is OWNER
    const userIsOwner = await isOwner(session.user.id, orgId)
    if (!userIsOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Verify the target user is a member of the organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            canUploadDocuments: true,
            canCreateConversations: true,
            canInviteUsers: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Usuario no es miembro de esta organización" },
        { status: 404 }
      )
    }

    // Get organization-specific permissions
    const orgPermissions = await prisma.organizationUserPermissions.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    // Get resolved permissions
    const resolvedPermissions = await resolveAllUserPermissions(userId, orgId)

    return NextResponse.json({
      user: membership.user,
      role: membership.role,
      globalPermissions: {
        canUploadDocuments: membership.user.canUploadDocuments,
        canCreateConversations: membership.user.canCreateConversations,
        canInviteUsers: membership.user.canInviteUsers,
      },
      orgOverrides: orgPermissions
        ? {
            canUploadDocuments: orgPermissions.canUploadDocuments,
            canCreateConversations: orgPermissions.canCreateConversations,
            canInviteUsers: orgPermissions.canInviteUsers,
          }
        : null,
      resolvedPermissions,
    })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos del usuario" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { orgId, userId } = await params

    // Verify user is OWNER
    const userIsOwner = await isOwner(session.user.id, orgId)
    if (!userIsOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Prevent owner from modifying their own permissions
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes modificar tus propios permisos" },
        { status: 400 }
      )
    }

    // Verify the target user is a member of the organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Usuario no es miembro de esta organización" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updatePermissionsSchema.parse(body)

    // Prepare update data (only include defined fields)
    const updateData: {
      canUploadDocuments?: boolean | null
      canCreateConversations?: boolean | null
      canInviteUsers?: boolean | null
    } = {}
    if (validatedData.canUploadDocuments !== undefined) {
      updateData.canUploadDocuments = validatedData.canUploadDocuments
    }
    if (validatedData.canCreateConversations !== undefined) {
      updateData.canCreateConversations = validatedData.canCreateConversations
    }
    if (validatedData.canInviteUsers !== undefined) {
      updateData.canInviteUsers = validatedData.canInviteUsers
    }

    // Upsert organization-specific permissions
    const orgPermissions = await prisma.organizationUserPermissions.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      update: updateData,
      create: {
        organizationId: orgId,
        userId,
        ...updateData,
      },
    })

    // Get resolved permissions
    const resolvedPermissions = await resolveAllUserPermissions(userId, orgId)

    return NextResponse.json({
      ...orgPermissions,
      resolvedPermissions,
    })
  } catch (error) {
    console.error("Error updating permissions:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al actualizar permisos" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId, userId } = await params

  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verify user is OWNER
    const userIsOwner = await isOwner(session.user.id, orgId)
    if (!userIsOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Delete organization-specific permissions (revert to global permissions)
    await prisma.organizationUserPermissions.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    // Get resolved permissions (should now use global permissions)
    const resolvedPermissions = await resolveAllUserPermissions(userId, orgId)

    return NextResponse.json({
      message: "Permisos de organización eliminados",
      resolvedPermissions,
    })
  } catch (error) {
    console.error("Error deleting permissions:", error)

    // If record doesn't exist, that's fine - it means no overrides were set
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      const resolvedPermissions = await resolveAllUserPermissions(userId, orgId)
      return NextResponse.json({
        message: "No había permisos de organización para eliminar",
        resolvedPermissions,
      })
    }

    return NextResponse.json(
      { error: "Error al eliminar permisos" },
      { status: 500 }
    )
  }
}

