import { NextResponse } from "next/server"
import { getSession } from '@/lib/auth/session'
import { prisma } from "@/lib/database/prisma-server"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Get complete user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error getting user info:", error)
    return NextResponse.json(
      { error: "Error al obtener información del usuario" },
      { status: 500 }
    )
  }
}
