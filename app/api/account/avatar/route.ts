import { NextRequest, NextResponse } from "next/server"
import { deleteFile, putFile } from "@/lib/storage"
import { prisma } from "@/lib/database/prisma-server"
import { getSession } from "@/lib/auth/session"
import {
  buildAvatarBlobPath,
  calculateAvatarLimitStatus,
  getDailyAvatarUploadLimit,
  getMaxAvatarSizeBytes,
  getStartOfUtcDay,
  isManagedAvatarUrl,
  validateAvatarFile,
} from "@/lib/account/avatar"

const DEFAULT_ERROR_MESSAGE = "No fue posible actualizar tu avatar. Inténtalo más tarde."

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "Debes seleccionar un archivo de imagen." },
        { status: 400 },
      )
    }

    const validation = validateAvatarFile(
      {
        size: file.size,
        type: file.type,
        name: file.name,
      },
      {
        maxSizeBytes: getMaxAvatarSizeBytes(),
      },
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 },
      )
    }

    const dailyLimit = getDailyAvatarUploadLimit()
    const startOfDay = getStartOfUtcDay()

    const uploadsToday = await prisma.avatarUploadLog.count({
      where: {
        userId: session.user.id,
        uploadedAt: {
          gte: startOfDay,
        },
      },
    })

    const limitStatus = calculateAvatarLimitStatus(uploadsToday, dailyLimit)

    if (!limitStatus.allowed) {
      return NextResponse.json(
        {
          error: "Has alcanzado el límite diario de cambios de avatar.",
          remaining: 0,
          dailyLimit,
          uploadsToday,
        },
        { status: 429 },
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    })

    const blobKey = buildAvatarBlobPath(session.user.id, file.name)
    const blob = await putFile(blobKey, file, { allowOverwrite: true })

    if (existingUser?.image && isManagedAvatarUrl(existingUser.image)) {
      try {
        await deleteFile(existingUser.image)
      } catch (deletionError) {
        console.warn("[ACCOUNT][AVATAR] No se pudo eliminar el avatar anterior:", deletionError)
      }
    }

    await prisma.avatarUploadLog.create({
      data: {
        userId: session.user.id,
        blobUrl: blob.url,
      },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: blob.url,
      },
    })

    const authModule = await import("@/lib/auth/auth")
    await authModule.auth.api.updateUser({
      headers: request.headers,
      body: {
        image: blob.url,
      },
    })

    const remainingAfterUpload = calculateAvatarLimitStatus(uploadsToday + 1, dailyLimit)

    return NextResponse.json({
      imageUrl: blob.url,
      remaining: remainingAfterUpload.remaining,
      dailyLimit,
    })
  } catch (error) {
    console.error("[ACCOUNT][AVATAR] Error al actualizar avatar:", error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
