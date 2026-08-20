import { describe, it, expect } from 'vitest'
import { isBlobAlreadyExistsError } from '@/lib/storage/blob-utils'

describe('blob-utils', () => {
  describe('isBlobAlreadyExistsError', () => {
    it('deberia retornar true cuando el error es instancia de Error con mensaje de blob existente', () => {
      const error = new Error(
        'Vercel Blob: This blob already exists, use `allowOverwrite: true` if you want to overwrite it.'
      )
      expect(isBlobAlreadyExistsError(error)).toBe(true)
    })

    it('deberia retornar true cuando el error es un objeto con propiedad message indicando blob existente', () => {
      const error = {
        message:
          'Vercel Blob: This blob already exists, use `allowOverwrite: true` si deseas sobrescribirlo.',
      }
      expect(isBlobAlreadyExistsError(error)).toBe(true)
    })

    it('deberia retornar true cuando el error es un string con mensaje de blob existente', () => {
      const error =
        'Vercel Blob: This blob already exists, use `allowOverwrite: true` if you want to overwrite it.'
      expect(isBlobAlreadyExistsError(error)).toBe(true)
    })

    it('deberia retornar false cuando el mensaje no indica blob existente', () => {
      const error = new Error('Network error')
      expect(isBlobAlreadyExistsError(error)).toBe(false)
    })

    it('deberia retornar false cuando el error es null o indefinido', () => {
      expect(isBlobAlreadyExistsError(null)).toBe(false)
      expect(isBlobAlreadyExistsError(undefined)).toBe(false)
    })
  })
})

