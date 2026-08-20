import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { isOwner } from "@/lib/auth/owner-auth"
import { prisma } from "@/lib/database/prisma-server"
import { resolveAllUserPermissions } from "@/lib/auth/permission-resolver"
import { z } from "zod"

const updatePermissionsSchema = z.object({
  userId: z.string(),
  canUploadDocuments: z.boolean().nullable().optional(),
  canCreateConversations: z.boolean().nullable().optional(),
  canInviteUsers: z.boolean().nullable().optional(),
})

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

    // Verify user is OWNER
    const userIsOwner = await isOwner(session.user.id, orgId)
    if (!userIsOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Get all members of the organization
    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
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

    // Get all permissions for each user
    const usersWithPermissions = await Promise.all(
      memberships.map(async (membership) => {
        const resolvedPermissions = await resolveAllUserPermissions(
          membership.userId,
          orgId
        )

        // Get organization-specific permissions if they exist
        const orgPermissions = await prisma.organizationUserPermissions.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: membership.userId,
            },
          },
        })

        return {
          userId: membership.userId,
          user: membership.user,
          role: membership.role,
          permissions: resolvedPermissions,
          orgOverrides: orgPermissions
            ? {
                canUploadDocuments: orgPermissions.canUploadDocuments,
                canCreateConversations: orgPermissions.canCreateConversations,
                canInviteUsers: orgPermissions.canInviteUsers,
              }
            : null,
        }
      })
    )

    return NextResponse.json({
      users: usersWithPermissions,
    })
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return NextResponse.json(
      { error: "Error al obtener permisos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { orgId } = await params

    // Verify user is OWNER
    const userIsOwner = await isOwner(session.user.id, orgId)
    if (!userIsOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePermissionsSchema.parse(body)

    // Verify the target user is a member of the organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: validatedData.userId,
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

    // Prevent owner from modifying their own permissions
    if (validatedData.userId === session.user.id) {
      return NextResponse.json(
        { error: "No puedes modificar tus propios permisos" },
        { status: 400 }
      )
    }

    // Upsert organization-specific permissions
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

    const orgPermissions = await prisma.organizationUserPermissions.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: validatedData.userId,
        },
      },
      update: updateData,
      create: {
        organizationId: orgId,
        userId: validatedData.userId,
        ...updateData,
      },
    })

    // Get resolved permissions
    const resolvedPermissions = await resolveAllUserPermissions(
      validatedData.userId,
      orgId
    )

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

