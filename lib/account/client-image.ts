"use client"

import imageCompression from "browser-image-compression"

const DEFAULT_MAX_SIZE_MB = Number(process.env.NEXT_PUBLIC_AVATAR_MAX_SIZE_MB || 1.5)
const DEFAULT_MAX_DIMENSION = Number(process.env.NEXT_PUBLIC_AVATAR_MAX_DIMENSION || 512)

export const compressAvatarFile = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: DEFAULT_MAX_SIZE_MB,
    maxWidthOrHeight: DEFAULT_MAX_DIMENSION,
    useWebWorker: true,
    initialQuality: 0.8,
  }

  try {
    const compressed = await imageCompression(file, options)

    if (compressed instanceof File) {
      return compressed
    }

    return new File([compressed], file.name, { type: (compressed as File)?.type ?? file.type })
  } catch (error) {
    console.warn("[ACCOUNT][AVATAR] Falló la compresión, se usará el archivo original:", error)
    return file
  }
}
