import { describe, it, expect } from 'vitest'
import {
  chunkText,
  extractTextFromPDF,
  extractTextFromTXT,
  extractTextFromMD,
  extractText,
  sanitizeDocumentText,
} from '@/lib/document/document-processing'

describe('procesamiento-de-documentos', () => {
  describe('extraerTextoDeTXT', () => {
    it('deberia extraer texto desde un buffer de texto', async () => {
      const buffer = Buffer.from('Hello, this is a test document.')
      const result = await extractTextFromTXT(buffer)
      expect(result).toBe('Hello, this is a test document.')
    })

    it('deberia manejar un buffer de texto vacio', async () => {
      const buffer = Buffer.from('')
      const result = await extractTextFromTXT(buffer)
      expect(result).toBe('')
    })

    it('deberia manejar caracteres UTF-8', async () => {
      const buffer = Buffer.from('Hola, ¿cómo estás? 你好')
      const result = await extractTextFromTXT(buffer)
      expect(result).toBe('Hola, ¿cómo estás? 你好')
    })

    it('deberia eliminar caracteres nulos en el texto extraido', async () => {
      const buffer = Buffer.from('Hola\u0000mundo')
      const result = await extractTextFromTXT(buffer)
      expect(result).toBe('Holamundo')
      expect(result.includes('\u0000')).toBe(false)
    })
  })

  describe('extraerTextoDeMD', () => {
    it('deberia extraer texto desde un buffer markdown', async () => {
      const buffer = Buffer.from('# Title\n\nThis is a **markdown** document.')
      const result = await extractTextFromMD(buffer)
      expect(result).toBe('# Title\n\nThis is a **markdown** document.')
    })

    it('deberia manejar un buffer markdown vacio', async () => {
      const buffer = Buffer.from('')
      const result = await extractTextFromMD(buffer)
      expect(result).toBe('')
    })
  })

  describe('extraerTextoDePDF', () => {
    it('deberia lanzar error con un buffer PDF invalido', async () => {
      const buffer = Buffer.from('This is not a valid PDF')
      await expect(extractTextFromPDF(buffer)).rejects.toThrow('Failed to extract text from PDF')
    })

    it('deberia manejar un buffer vacio', async () => {
      const buffer = Buffer.from('')
      await expect(extractTextFromPDF(buffer)).rejects.toThrow()
    })
  })

  describe('extraerTexto', () => {
    it('deberia redirigir a extractTextFromPDF cuando el tipo es pdf', async () => {
      const buffer = Buffer.from('fake pdf content')
      await expect(extractText(buffer, 'pdf')).rejects.toThrow()
    })

    it('deberia redirigir a extractTextFromTXT cuando el tipo es txt', async () => {
      const buffer = Buffer.from('Text content')
      const result = await extractText(buffer, 'txt')
      expect(result).toBe('Text content')
    })

    it('deberia redirigir a extractTextFromMD cuando el tipo es md', async () => {
      const buffer = Buffer.from('# Markdown')
      const result = await extractText(buffer, 'md')
      expect(result).toBe('# Markdown')
    })

    it('deberia redirigir a extractTextFromMD cuando el tipo es markdown', async () => {
      const buffer = Buffer.from('# Markdown')
      const result = await extractText(buffer, 'markdown')
      expect(result).toBe('# Markdown')
    })

    it('deberia manejar tipos de archivo sin sensibilidad a mayusculas', async () => {
      const buffer = Buffer.from('Text content')
      const result = await extractText(buffer, 'TXT')
      expect(result).toBe('Text content')
    })

    it('deberia lanzar error para tipos de archivo no soportados', async () => {
      const buffer = Buffer.from('content')
      await expect(extractText(buffer, 'docx')).rejects.toThrow('Unsupported file type: docx')
    })
  })

  describe('sanitizarDocumento', () => {
    it('deberia eliminar caracteres nulos del texto', () => {
      const text = 'hola\u0000mundo\u0000'
      const sanitized = sanitizeDocumentText(text)
      expect(sanitized).toBe('holamundo')
    })

    it('deberia mantener caracteres utf8 validos', () => {
      const text = 'ajedrez ♔ y café'
      const sanitized = sanitizeDocumentText(text)
      expect(sanitized).toBe('ajedrez ♔ y café')
    })
  })

  describe('fragmentarTexto', () => {
    it('deberia generar fragmentos sin caracteres nulos', async () => {
      const chunks = await chunkText('Hola\u0000 mundo. Este es un texto\u0000 limpio.')
      const chunkTexts = chunks.map((chunk) => chunk.text)
      expect(chunkTexts.every((chunk) => !chunk.includes('\u0000'))).toBe(true)
    })
  })
})

