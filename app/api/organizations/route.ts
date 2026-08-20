import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from '@/lib/auth/session'
import { z } from "zod"

const createOrgSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  slug: z
    .string()
    .min(1, "El slug es requerido")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createOrgSchema.parse(body)

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: "Este slug ya está en uso" },
        { status: 400 }
      )
    }

    // Create organization and membership in a transaction
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
        },
      })

      // Create membership with OWNER role
      await tx.membership.create({
        data: {
          userId: session.user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      })

      return org
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Error creating organization:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error al crear la organización" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Get all organizations where user is a member
    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
    }))

    return NextResponse.json(organizations)
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { error: "Error al obtener organizaciones" },
      { status: 500 }
    )
  }
}

