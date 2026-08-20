/**
 * Capa de almacenamiento de archivos.
 *
 * Tres drivers, elegidos con STORAGE_DRIVER:
 *
 *   local        Disco del propio servidor. Cero servicios extra. Por defecto.
 *   s3           Cualquier almacén compatible con S3: MinIO, Ceph, Garage,
 *                Cloudflare R2, Backblaze B2 o el S3 de AWS.
 *   vercel-blob  Sólo tiene sentido desplegando en Vercel.
 *
 * Los drivers `local` y `s3` devuelven URLs servidas por la propia aplicación
 * (/api/files/...), de modo que el control de acceso se aplica siempre. Con
 * `vercel-blob` la URL es pública y ajena a nosotros: es la naturaleza de ese
 * servicio, y por eso no es el driver recomendado para documentos internos.
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StorageDriver = 'local' | 's3' | 'vercel-blob'

export const storageDriver = (process.env.STORAGE_DRIVER ?? 'local') as StorageDriver

/** Raíz en disco donde se guardan los archivos subidos (driver local). */
export const storageRoot = path.resolve(process.env.STORAGE_PATH ?? './storage')

/** Prefijo de las URLs servidas por app/api/files/[...path]/route.ts */
export const LOCAL_URL_PREFIX = '/api/files/'

export interface PutOptions {
  /** Sobrescribir si ya existe una clave igual. */
  allowOverwrite?: boolean
  contentType?: string
}

export interface StoredFile {
  url: string
}

export interface RetrievedFile {
  body: Buffer
  contentType?: string
  size: number
}

export class FileAlreadyExistsError extends Error {
  constructor(key: string) {
    super(`El archivo "${key}" ya existe en el almacenamiento`)
    this.name = 'FileAlreadyExistsError'
  }
}

export class FileNotFoundError extends Error {
  constructor(key: string) {
    super(`El archivo "${key}" no existe en el almacenamiento`)
    this.name = 'FileNotFoundError'
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

// ─── Driver S3 ───────────────────────────────────────────────────────────────

export interface S3Config {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** MinIO y Ceph necesitan rutas tipo https://host/bucket/key. */
  forcePathStyle: boolean
}

export function s3Config(): S3Config {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  const missing = [
    ['S3_ENDPOINT', endpoint],
    ['S3_BUCKET', bucket],
    ['S3_ACCESS_KEY_ID', accessKeyId],
    ['S3_SECRET_ACCESS_KEY', secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(
      `STORAGE_DRIVER=s3 requiere ${missing.join(', ')}. Ver docs/self-hosting.md`
    )
  }

  return {
    endpoint: endpoint!.replace(/\/+$/, ''),
    bucket: bucket!,
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    // MinIO por defecto sirve en path-style; los proveedores gestionados no.
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
  }
}

/** URL absoluta del objeto dentro del almacén S3 (no se expone al navegador). */
export function s3ObjectUrl(config: S3Config, key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')

  if (config.forcePathStyle) {
    return `${config.endpoint}/${config.bucket}/${encodedKey}`
  }

  const url = new URL(config.endpoint)
  return `${url.protocol}//${config.bucket}.${url.host}/${encodedKey}`
}

async function s3Client() {
  const { AwsClient } = await import('aws4fetch')
  const config = s3Config()

  return {
    config,
    client: new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      service: 's3',
    }),
  }
}

// ─── API pública ─────────────────────────────────────────────────────────────

export async function putFile(
  key: string,
  file: Blob,
  options: PutOptions = {}
): Promise<StoredFile> {
  const safeKey = sanitizeKey(key)

  if (storageDriver === 'vercel-blob') {
    const { put } = await import('@vercel/blob')
    const { isBlobAlreadyExistsError } = await import('./blob-utils')
    try {
      const blob = await put(safeKey, file, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: options.allowOverwrite,
      })
      return { url: blob.url }
    } catch (error) {
      if (isBlobAlreadyExistsError(error)) {
        throw new FileAlreadyExistsError(safeKey)
      }
      throw error
    }
  }

  if (storageDriver === 's3') {
    const { client, config } = await s3Client()
    const url = s3ObjectUrl(config, safeKey)

    if (!options.allowOverwrite) {
      const head = await client.fetch(url, { method: 'HEAD' })
      if (head.ok) {
        throw new FileAlreadyExistsError(safeKey)
      }
    }

    const response = await client.fetch(url, {
      method: 'PUT',
      body: await file.arrayBuffer(),
      headers: {
        'Content-Type': options.contentType || file.type || 'application/octet-stream',
      },
    })

    if (!response.ok) {
      throw new Error(
        `El almacén S3 rechazó la subida de "${safeKey}": ${response.status} ${response.statusText}`
      )
    }

    return { url: localUrlFor(safeKey) }
  }

  const filePath = resolveStoragePath(safeKey)

  if (!options.allowOverwrite && (await exists(filePath))) {
    throw new FileAlreadyExistsError(safeKey)
  }

  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

  return { url: localUrlFor(safeKey) }
}

/** Lee un archivo por su clave. Sólo para los drivers servidos por la app. */
export async function getFile(key: string): Promise<RetrievedFile> {
  const safeKey = sanitizeKey(key)

  if (storageDriver === 's3') {
    const { client, config } = await s3Client()
    const response = await client.fetch(s3ObjectUrl(config, safeKey))

    if (response.status === 404) {
      throw new FileNotFoundError(safeKey)
    }

    if (!response.ok) {
      throw new Error(
        `El almacén S3 falló al leer "${safeKey}": ${response.status} ${response.statusText}`
      )
    }

    const body = Buffer.from(await response.arrayBuffer())

    return {
      body,
      contentType: response.headers.get('content-type') ?? undefined,
      size: body.byteLength,
    }
  }

  const filePath = resolveStoragePath(safeKey)

  try {
    const info = await stat(filePath)

    if (!info.isFile()) {
      throw new FileNotFoundError(safeKey)
    }

    return { body: await readFile(filePath), size: info.size }
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      throw error
    }
    throw new FileNotFoundError(safeKey)
  }
}

export async function deleteFile(url: string): Promise<void> {
  if (isLocalFileUrl(url)) {
    const key = sanitizeKey(keyFromLocalUrl(url))

    if (storageDriver === 's3') {
      const { client, config } = await s3Client()
      await client.fetch(s3ObjectUrl(config, key), { method: 'DELETE' })
      return
    }

    await rm(resolveStoragePath(key), { force: true })
    return
  }

  if (url.includes('.blob.vercel-storage.com')) {
    const { del } = await import('@vercel/blob')
    await del(url)
  }
}
