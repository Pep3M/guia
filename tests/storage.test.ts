import { describe, expect, test } from 'vitest'
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
