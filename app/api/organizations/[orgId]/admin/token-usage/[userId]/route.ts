import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { isOwner } from "@/lib/auth/owner-auth"
import { prisma } from "@/lib/database/prisma-server"

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
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Usuario no es miembro de esta organización" },
        { status: 404 }
      )
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Get daily and monthly usage
    const now = new Date()
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [dailyUsage, monthlyUsage] = await Promise.all([
      prisma.tokenUsage.aggregate({
        where: {
          organizationId: orgId,
          userId,
          createdAt: {
            gte: dayStart,
            lte: now,
          },
        },
        _sum: {
          tokensTotal: true,
          costUSD: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.tokenUsage.aggregate({
        where: {
          organizationId: orgId,
          userId,
          createdAt: {
            gte: monthStart,
            lte: now,
          },
        },
        _sum: {
          tokensTotal: true,
          costUSD: true,
        },
        _count: {
          id: true,
        },
      }),
    ])

    // Get historical data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const historicalData = await prisma.$queryRaw<
      Array<{ date: Date; tokens: bigint; cost: number; requests: bigint }>
    >`
      SELECT 
        DATE("createdAt") as date,
        SUM("tokensTotal")::bigint as tokens,
        SUM("costUSD")::float as cost,
        COUNT(*)::bigint as requests
      FROM "TokenUsage"
      WHERE "organizationId" = ${orgId}
        AND "userId" = ${userId}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `

    // Get usage by operation (this month)
    const usageByOperation = await prisma.tokenUsage.groupBy({
      by: ["operation"],
      where: {
        organizationId: orgId,
        userId,
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        tokensTotal: true,
        costUSD: true,
      },
      _count: {
        id: true,
      },
    })

    // Get user token limits
    const userLimits = await prisma.userTokenLimits.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    })

    return NextResponse.json({
      user,
      usage: {
        daily: {
          tokensTotal: dailyUsage._sum.tokensTotal || 0,
          costTotal: dailyUsage._sum.costUSD || 0,
          requestCount: dailyUsage._count.id || 0,
        },
        monthly: {
          tokensTotal: monthlyUsage._sum.tokensTotal || 0,
          costTotal: monthlyUsage._sum.costUSD || 0,
          requestCount: monthlyUsage._count.id || 0,
        },
        historical: historicalData.map((item) => ({
          date: item.date,
          tokens: Number(item.tokens),
          cost: item.cost,
          requests: Number(item.requests),
        })),
        byOperation: usageByOperation.map((item) => ({
          operation: item.operation,
          tokens: item._sum.tokensTotal || 0,
          cost: item._sum.costUSD || 0,
          requests: item._count.id || 0,
        })),
      },
      limits: {
        dailyTokenLimit: userLimits?.dailyTokenLimit ?? null,
        monthlyTokenLimit: userLimits?.monthlyTokenLimit ?? null,
      },
    })
  } catch (error) {
    console.error("Error fetching user token usage:", error)
    return NextResponse.json(
      { error: "Error al obtener uso de tokens del usuario" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Usuario no es miembro de esta organización" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { dailyTokenLimit, monthlyTokenLimit } = body

    // Validate limits
    if (dailyTokenLimit !== null && dailyTokenLimit !== undefined) {
      if (typeof dailyTokenLimit !== "number" || dailyTokenLimit < 0) {
        return NextResponse.json(
          { error: "El límite diario debe ser un número positivo o null" },
          { status: 400 }
        )
      }
    }

    if (monthlyTokenLimit !== null && monthlyTokenLimit !== undefined) {
      if (typeof monthlyTokenLimit !== "number" || monthlyTokenLimit < 0) {
        return NextResponse.json(
          { error: "El límite mensual debe ser un número positivo o null" },
          { status: 400 }
        )
      }
    }

    // Validate that daily limit is not greater than monthly limit if both are set
    if (
      dailyTokenLimit !== null &&
      dailyTokenLimit !== undefined &&
      monthlyTokenLimit !== null &&
      monthlyTokenLimit !== undefined &&
      dailyTokenLimit > monthlyTokenLimit
    ) {
      return NextResponse.json(
        { error: "El límite diario no puede ser mayor que el límite mensual" },
        { status: 400 }
      )
    }

    // Upsert user token limits
    const userLimits = await prisma.userTokenLimits.upsert({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      update: {
        dailyTokenLimit: dailyTokenLimit === null ? null : dailyTokenLimit === undefined ? undefined : dailyTokenLimit,
        monthlyTokenLimit: monthlyTokenLimit === null ? null : monthlyTokenLimit === undefined ? undefined : monthlyTokenLimit,
        updatedBy: session.user.id,
      },
      create: {
        organizationId: orgId,
        userId,
        dailyTokenLimit: dailyTokenLimit === null ? null : dailyTokenLimit,
        monthlyTokenLimit: monthlyTokenLimit === null ? null : monthlyTokenLimit,
        updatedBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      limits: {
        dailyTokenLimit: userLimits.dailyTokenLimit,
        monthlyTokenLimit: userLimits.monthlyTokenLimit,
      },
    })
  } catch (error) {
    console.error("Error setting user token limits:", error)
    return NextResponse.json(
      { error: "Error al establecer límites de tokens del usuario" },
      { status: 500 }
    )
  }
}

