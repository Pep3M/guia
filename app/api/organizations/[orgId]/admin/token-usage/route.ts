import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { isOwner } from "@/lib/auth/owner-auth"
import { prisma } from "@/lib/database/prisma-server"
import { getUserUsageBreakdown } from "@/lib/ai/token-tracker"

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

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "month") as "day" | "month"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // Get usage breakdown
    const usageBreakdown = await getUserUsageBreakdown(orgId, period)

    // Get user IDs
    const userIds = usageBreakdown.map((u) => u.userId)

    // Get user data
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Enrich usage with user data
    const enrichedUsage = usageBreakdown.map((usage) => {
      const user = users.find((u) => u.id === usage.userId)
      return {
        ...usage,
        user: user || { id: usage.userId, name: "Unknown", email: "unknown@example.com" },
      }
    })

    // Paginate
    const paginatedUsage = enrichedUsage.slice(skip, skip + limit)
    const total = enrichedUsage.length
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      period,
      page,
      limit,
      total,
      totalPages,
      data: paginatedUsage,
    })
  } catch (error) {
    console.error("Error fetching token usage:", error)
    return NextResponse.json(
      { error: "Error al obtener uso de tokens" },
      { status: 500 }
    )
  }
}

