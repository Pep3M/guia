import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/database/prisma-server"
import { getOrganizationUsage } from "@/lib/ai/token-tracker"
import { getUserUsageBreakdown } from "@/lib/ai/token-tracker"

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

    // Get organization data
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            memberships: true,
            knowledgeSources: true,
            conversations: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      )
    }

    // Get chunks count
    const chunksCount = await prisma.chunk.count({
      where: { organizationId: orgId },
    })

    // Cuotas de la organización. Son opcionales: sin registro, sin límite.
    const orgLimits = await prisma.organizationLimits.findUnique({
      where: { organizationId: orgId },
    })

    // Calculate monthly consumption period (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    // Calculate total storage used (sum of fileSizeBytes for all documents)
    const storageStats = await prisma.knowledgeSource.aggregate({
      where: {
        organizationId: orgId,
        fileSizeBytes: {
          not: null,
        },
      },
      _sum: {
        fileSizeBytes: true,
      },
    })

    // For legacy documents without fileSizeBytes, estimate 1MB per document
    const legacyDocsCount = await prisma.knowledgeSource.count({
      where: {
        organizationId: orgId,
        fileSizeBytes: null,
      },
    })

    const actualStorageBytes = storageStats._sum.fileSizeBytes ? Number(storageStats._sum.fileSizeBytes) : 0
    const estimatedLegacyStorageBytes = legacyDocsCount * 1024 * 1024 // Estimate 1MB per legacy doc
    const totalStorageBytes = actualStorageBytes + estimatedLegacyStorageBytes

    // Get monthly conversations count (conversations created this month)
    const monthlyConversationsCount = await prisma.conversation.count({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: monthStart,
          lte: now,
        },
      },
    })

    // Get token usage
    const [dailyUsage, monthlyUsage, topUsers] = await Promise.all([
      getOrganizationUsage(orgId, "day"),
      getOrganizationUsage(orgId, "month"),
      getUserUsageBreakdown(orgId, "month"),
    ])

    // Get historical data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const historicalData = await prisma.$queryRaw<
      Array<{ date: Date; tokens: bigint; requests: bigint }>
    >`
      SELECT 
        DATE("createdAt") as date,
        SUM("tokensTotal")::bigint as tokens,
        COUNT(*)::bigint as requests
      FROM "TokenUsage"
      WHERE "organizationId" = ${orgId}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `

    // Enrich top users with user data
    const topUserIds = topUsers.slice(0, 5).map((u) => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const enrichedTopUsers = topUsers.slice(0, 5).map((usage) => {
      const user = users.find((u) => u.id === usage.userId)
      return {
        ...usage,
        user: user || { id: usage.userId, name: "Unknown", email: "unknown@example.com" },
      }
    })

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      stats: {
        members: organization._count.memberships,
        documents: organization._count.knowledgeSources,
        chunks: chunksCount,
        conversations: organization._count.conversations,
        // Monthly consumption
        monthlyConversations: monthlyConversationsCount,
        // Storage (total, not monthly)
        totalStorageBytes: totalStorageBytes,
      },
      limits: {
        organization: {
          monthlyTokenLimit: orgLimits?.monthlyTokenLimit ?? null,
          dailyTokenLimit: orgLimits?.dailyTokenLimit ?? null,
        },
      },
      tokenUsage: {
        daily: dailyUsage,
        monthly: monthlyUsage,
        topUsers: enrichedTopUsers,
        historical: historicalData.map((item) => ({
          date: item.date.toISOString(),
          tokens: Number(item.tokens),
          requests: Number(item.requests),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching organization stats:", error)
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    )
  }
}

