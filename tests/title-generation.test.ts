import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateConversationTitle, generateConversationTitleStreaming } from '@/lib/ai/title-generation'

// Mock the AI SDK. vi.hoisted es necesario porque vi.mock se eleva por encima
// de las declaraciones del módulo.
const { mockGenerateText } = vi.hoisted(() => ({ mockGenerateText: vi.fn() }))
vi.mock('ai', () => ({
  generateText: mockGenerateText,
}))

// Mock del proveedor de modelos
vi.mock('@/lib/ai/provider', () => ({
  chatModel: vi.fn(() => 'mock-model'),
  CHAT_MODEL: 'gpt-4o-mini',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIMENSIONS: 1536,
  embeddingsClient: vi.fn(() => ({ embeddings: { create: vi.fn() } })),
}))

describe('generacion-de-titulos', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
  })

  describe('generarTituloDeConversacion', () => {
    it('deberia generar un titulo exitosamente', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Consulta sobre políticas de RRHH',
      })

      const result = await generateConversationTitle(
        '¿Cuáles son las políticas de vacaciones en la empresa?',
        'Las políticas de vacaciones incluyen...'
      )

      expect(result).toBe('Consulta sobre políticas de RRHH')
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: 'mock-model',
        prompt: expect.stringContaining('Genera un título conciso y descriptivo'),
        maxOutputTokens: 100,
        temperature: 0.3,
      })
    })

    it('deberia manejar respuestas vacias con un fallback', async () => {
      mockGenerateText.mockResolvedValue({
        text: '',
      })

      const userMessage = '¿Cuáles son las políticas de vacaciones?'
      const result = await generateConversationTitle(userMessage)

      expect(result).toBe(userMessage)
    })

    it('deberia manejar respuestas muy cortas con un fallback', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Hi',
      })

      const userMessage = '¿Cuáles son las políticas de vacaciones en la empresa?'
      const result = await generateConversationTitle(userMessage)

      expect(result).toBe('¿Cuáles son las políticas de vacaciones en la e...')
    })

    it('deberia eliminar comillas de la respuesta de la IA', async () => {
      mockGenerateText.mockResolvedValue({
        text: '"Consulta sobre políticas de RRHH"',
      })

      const result = await generateConversationTitle('¿Cuáles son las políticas?')

      expect(result).toBe('Consulta sobre políticas de RRHH')
    })

    it('deberia truncar titulos largos', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Este es un título muy largo que definitivamente excede el límite de 60 caracteres establecido',
      })

      const result = await generateConversationTitle('¿Cuáles son las políticas?')

      expect(result).toBe('Este es un título muy largo que definitivamente excede el...')
      expect(result.length).toBe(60)
    })

    it('deberia manejar errores de la API con un fallback', async () => {
      mockGenerateText.mockRejectedValue(new Error('API Error'))

      const userMessage = '¿Cuáles son las políticas de vacaciones?'
      const result = await generateConversationTitle(userMessage)

      expect(result).toBe(userMessage)
    })

    it('deberia generar un titulo alternativo para mensajes de usuario largos', async () => {
      mockGenerateText.mockRejectedValue(new Error('API Error'))

      const userMessage = 'Esta es una pregunta muy larga que definitivamente excede el límite de 50 caracteres establecido para el fallback'
      const result = await generateConversationTitle(userMessage)

      expect(result).toBe('Esta es una pregunta muy larga que definitivame...')
      expect(result.length).toBe(50)
    })
  })

  describe('generarTituloDeConversacionEnStreaming', () => {
    it('deberia llamar a onTitleUpdate primero con un titulo temporal', async () => {
      const onTitleUpdate = vi.fn()
      
      mockGenerateText.mockResolvedValue({
        text: 'Consulta sobre políticas',
      })

      await generateConversationTitleStreaming(
        '¿Cuáles son las políticas?',
        onTitleUpdate
      )

      expect(onTitleUpdate).toHaveBeenCalledWith('Generando título...')
      expect(onTitleUpdate).toHaveBeenCalledWith('Consulta sobre políticas')
    })

    it('deberia manejar errores en modo streaming', async () => {
      const onTitleUpdate = vi.fn()
      
      mockGenerateText.mockRejectedValue(new Error('API Error'))

      const userMessage = '¿Cuáles son las políticas?'
      const result = await generateConversationTitleStreaming(
        userMessage,
        onTitleUpdate
      )

      expect(onTitleUpdate).toHaveBeenCalledWith('Generando título...')
      expect(onTitleUpdate).toHaveBeenCalledWith(userMessage)
      expect(result).toBe(userMessage)
    })

    it('deberia funcionar sin el callback onTitleUpdate', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Consulta sobre políticas',
      })

      const result = await generateConversationTitleStreaming(
        '¿Cuáles son las políticas?'
      )

      expect(result).toBe('Consulta sobre políticas')
    })
  })
})
