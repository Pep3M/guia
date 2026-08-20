import { afterEach, describe, expect, test } from 'vitest'
import path from 'node:path'

import {
  isLocalFileUrl,
  keyFromLocalUrl,
  resolveStoragePath,
  sanitizeKey,
  storageRoot,
} from '@/lib/storage'

describe('sanitizeKey', () => {
  test('conserva claves normales con subdirectorios', () => {
    expect(sanitizeKey('avatars/user-1.png')).toBe('avatars/user-1.png')
  })

  test('elimina los componentes de recorrido de directorios', () => {
    expect(sanitizeKey('../../etc/passwd')).toBe('etc/passwd')
    expect(sanitizeKey('a/../../b.txt')).toBe('a/b.txt')
    expect(sanitizeKey('/absoluta/x.pdf')).toBe('absoluta/x.pdf')
  })

  test('sustituye caracteres que no son seguros en un nombre de archivo', () => {
    expect(sanitizeKey('informe:2024?.pdf')).toBe('informe_2024_.pdf')
  })

  test('acepta acentos y eñes', () => {
    expect(sanitizeKey('documentación/año-fiscal.pdf')).toBe('documentación/año-fiscal.pdf')
  })

  test('rechaza claves que quedan vacías', () => {
    expect(() => sanitizeKey('../..')).toThrow()
    expect(() => sanitizeKey('   ')).toThrow()
  })
})

describe('resolveStoragePath', () => {
  test('resuelve dentro de la raíz de almacenamiento', () => {
    expect(resolveStoragePath('docs/a.pdf')).toBe(path.join(storageRoot, 'docs/a.pdf'))
  })

  test('nunca escapa de la raíz aunque la clave lo intente', () => {
    expect(resolveStoragePath('../../../etc/passwd').startsWith(storageRoot)).toBe(true)
  })
})

describe('URLs locales', () => {
  test('reconoce y decodifica las URLs servidas por /api/files', () => {
    expect(isLocalFileUrl('/api/files/docs/a.pdf')).toBe(true)
    expect(isLocalFileUrl('https://x.blob.vercel-storage.com/a.pdf')).toBe(false)
    expect(keyFromLocalUrl('/api/files/docs/informe%20anual.pdf')).toBe('docs/informe anual.pdf')
  })
})

describe('configuración S3', () => {
  const env = { ...process.env }

  afterEach(() => {
    process.env = { ...env }
  })

  test('exige las variables imprescindibles y las nombra', async () => {
    delete process.env.S3_ENDPOINT
    delete process.env.S3_BUCKET
    delete process.env.S3_ACCESS_KEY_ID
    delete process.env.S3_SECRET_ACCESS_KEY

    const { s3Config } = await import('@/lib/storage')

    expect(() => s3Config()).toThrow(/S3_ENDPOINT.*S3_BUCKET/)
  })

  test('usa path-style por defecto, como necesita MinIO', async () => {
    process.env.S3_ENDPOINT = 'http://minio:9000'
    process.env.S3_BUCKET = 'guia'
    process.env.S3_ACCESS_KEY_ID = 'key'
    process.env.S3_SECRET_ACCESS_KEY = 'secret'
    delete process.env.S3_FORCE_PATH_STYLE

    const { s3Config, s3ObjectUrl } = await import('@/lib/storage')
    const config = s3Config()

    expect(config.forcePathStyle).toBe(true)
    expect(s3ObjectUrl(config, 'docs/informe anual.pdf')).toBe(
      'http://minio:9000/guia/docs/informe%20anual.pdf'
    )
  })

  test('usa virtual-host style cuando se desactiva, como en R2 y AWS', async () => {
    process.env.S3_ENDPOINT = 'https://cuenta.r2.cloudflarestorage.com'
    process.env.S3_BUCKET = 'guia'
    process.env.S3_ACCESS_KEY_ID = 'key'
    process.env.S3_SECRET_ACCESS_KEY = 'secret'
    process.env.S3_FORCE_PATH_STYLE = 'false'

    const { s3Config, s3ObjectUrl } = await import('@/lib/storage')

    expect(s3ObjectUrl(s3Config(), 'a.pdf')).toBe(
      'https://guia.cuenta.r2.cloudflarestorage.com/a.pdf'
    )
  })
})
