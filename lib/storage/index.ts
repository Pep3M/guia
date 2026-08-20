/**
 * Capa de almacenamiento de archivos.
 *
 * Driver por defecto: `local` (disco del propio servidor), que es lo que
 * corresponde a una instalación autohospedada. `vercel-blob` se mantiene para
 * despliegues en Vercel y se activa con STORAGE_DRIVER=vercel-blob.
 */
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StorageDriver = 'local' | 'vercel-blob'

export const storageDriver = (process.env.STORAGE_DRIVER ?? 'local') as StorageDriver

/** Raíz en disco donde se guardan los archivos subidos (driver local). */
export const storageRoot = path.resolve(process.env.STORAGE_PATH ?? './storage')

/** Prefijo de las URLs servidas por app/api/files/[...path]/route.ts */
export const LOCAL_URL_PREFIX = '/api/files/'

export interface PutOptions {
  /** Sobrescribir si ya existe una clave igual. */
  allowOverwrite?: boolean
}

export interface StoredFile {
  url: string
}

export class FileAlreadyExistsError extends Error {
  constructor(key: string) {
    super(`El archivo "${key}" ya existe en el almacenamiento`)
    this.name = 'FileAlreadyExistsError'
  }
}

/**
 * Convierte una clave arbitraria (nombre de archivo incluido) en una ruta
 * relativa segura: sin componentes vacíos, sin `..` y sin rutas absolutas.
 */
export function sanitizeKey(key: string): string {
  const segments = key
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[^\p{L}\p{N}._\- ]/gu, '_'))

  if (segments.length === 0) {
    throw new Error('Clave de almacenamiento inválida')
  }

  return segments.join('/')
}

/** Resuelve una clave a ruta absoluta garantizando que no escapa de storageRoot. */
export function resolveStoragePath(key: string): string {
  const target = path.resolve(storageRoot, sanitizeKey(key))
  const root = storageRoot.endsWith(path.sep) ? storageRoot : storageRoot + path.sep

  if (!target.startsWith(root)) {
    throw new Error('Ruta de almacenamiento fuera del directorio permitido')
  }

  return target
}

export function isLocalFileUrl(url: string): boolean {
  return url.startsWith(LOCAL_URL_PREFIX)
}

export function keyFromLocalUrl(url: string): string {
  return decodeURIComponent(url.slice(LOCAL_URL_PREFIX.length))
}

function localUrlFor(key: string): string {
  return LOCAL_URL_PREFIX + key.split('/').map(encodeURIComponent).join('/')
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

export async function putFile(
  key: string,
  file: Blob,
  options: PutOptions = {}
): Promise<StoredFile> {
  if (storageDriver === 'vercel-blob') {
    const { put } = await import('@vercel/blob')
    const { isBlobAlreadyExistsError } = await import('./blob-utils')
    try {
      const blob = await put(key, file, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: options.allowOverwrite,
      })
      return { url: blob.url }
    } catch (error) {
      if (isBlobAlreadyExistsError(error)) {
        throw new FileAlreadyExistsError(key)
      }
      throw error
    }
  }

  const safeKey = sanitizeKey(key)
  const filePath = resolveStoragePath(safeKey)

  if (!options.allowOverwrite && (await exists(filePath))) {
    throw new FileAlreadyExistsError(safeKey)
  }

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

  return { url: localUrlFor(safeKey) }
}

export async function deleteFile(url: string): Promise<void> {
  if (isLocalFileUrl(url)) {
    await rm(resolveStoragePath(keyFromLocalUrl(url)), { force: true })
    return
  }

  if (url.includes('.blob.vercel-storage.com')) {
    const { del } = await import('@vercel/blob')
    await del(url)
  }
}
