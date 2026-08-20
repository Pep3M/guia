import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/database/prisma-server"

interface RouteParams {
  params: Promise<{ orgId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
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
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Get recent conversations (last 5)
    const recentConversations = await prisma.conversation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        userId: true,
        createdAt: true,
      },
    })

    // Get users for conversations
    const conversationUserIds = recentConversations.map((conv) => conv.userId)
    const conversationUsers = await prisma.user.findMany({
      where: { id: { in: conversationUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Get recent knowledge sources with their uploaded by info from TokenUsage
    const recentKnowledgeSources = await prisma.knowledgeSource.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // For each knowledge source, get the user who uploaded it from TokenUsage
    const knowledgeSourceActivities = await Promise.all(
      recentKnowledgeSources.map(async (ks) => {
        const tokenUsage = await prisma.tokenUsage.findFirst({
          where: {
            organizationId: orgId,
            operation: "embedding",
            createdAt: {
              gte: new Date(ks.createdAt.getTime() - 5 * 60 * 1000), // Within 5 minutes
            },
          },
          orderBy: { createdAt: "desc" },
        })

        if (tokenUsage) {
          const user = await prisma.user.findUnique({
            where: { id: tokenUsage.userId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })

          return {
            type: "document" as const,
            id: ks.id,
            user: user || { id: tokenUsage.userId, name: "Usuario", email: "" },
            message: "subió un documento",
            createdAt: ks.createdAt,
            metadata: {
              fileName: ks.fileName,
              status: ks.status,
            },
          }
        }

        return null
      })
    )

    // Get recent memberships (last 5)
    const recentMemberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Combine all activities and sort by date
    const activities = [
      ...recentConversations.map((conv) => {
        const user = conversationUsers.find((u) => u.id === conv.userId)
        return {
          type: "conversation" as const,
          id: conv.id,
          user: user || { id: conv.userId, name: "Usuario", email: "" },
          message: "inició una nueva conversación",
          createdAt: conv.createdAt,
          metadata: {
            title: conv.title,
          },
        }
      }),
      ...knowledgeSourceActivities.filter((ks) => ks !== null),
      ...recentMemberships.map((membership) => ({
        type: "membership" as const,
        id: membership.id,
        user: membership.user,
        message: "se unió a la organización",
        createdAt: membership.createdAt,
        metadata: {
          role: membership.role,
        },
      })),
    ]

    // Sort by date and take the most recent 10
    const sortedActivities = activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)

    return NextResponse.json({ activities: sortedActivities })
  } catch (error) {
    console.error("Error fetching recent activity:", error)
    return NextResponse.json(
      { error: "Error al obtener actividad reciente" },
      { status: 500 }
    )
  }
}

