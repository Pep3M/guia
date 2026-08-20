import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { 
  updateConversationTitleIntelligently, 
  isFirstExchange 
} from '@/lib/conversation/conversation-title-utils'
import { generateConversationTitle } from '@/lib/ai/title-generation'
import { updateConversationTitle } from '@/lib/conversation/conversation-utils'
import * as titleGenerationModule from '@/lib/ai/title-generation'
import * as conversationUtilsModule from '@/lib/conversation/conversation-utils'

const generateConversationTitleSpy = vi.spyOn(
  titleGenerationModule,
  'generateConversationTitle'
)

const updateConversationTitleSpy = vi.spyOn(
  conversationUtilsModule,
  'updateConversationTitle'
)

describe('utilidades-de-titulos-de-conversacion', () => {
  beforeEach(() => {
    generateConversationTitleSpy.mockReset()
    updateConversationTitleSpy.mockReset()
  })

  afterAll(() => {
    generateConversationTitleSpy.mockRestore()
    updateConversationTitleSpy.mockRestore()
  })

  describe('actualizarTituloInteligentemente', () => {
    it('deberia actualizar el titulo usando IA cuando es exitoso', async () => {
      const mockTitle = 'AI Generated Title'
      generateConversationTitleSpy.mockResolvedValue(mockTitle)
      updateConversationTitleSpy.mockResolvedValue()

      await updateConversationTitleIntelligently(
        'conv-123',
        'What is machine learning?',
        'Machine learning is a subset of artificial intelligence...'
      )

      expect(generateConversationTitle).toHaveBeenCalledWith(
        'What is machine learning?',
        'Machine learning is a subset of artificial intelligence...'
      )
      expect(updateConversationTitle).toHaveBeenCalledWith('conv-123', mockTitle)
    })

    it('deberia usar un titulo simple cuando falla la generacion con IA', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      generateConversationTitleSpy.mockRejectedValue(new Error('AI service unavailable'))
      updateConversationTitleSpy.mockResolvedValue()

      await updateConversationTitleIntelligently(
        'conv-123',
        'What is machine learning?',
        'Machine learning is a subset of artificial intelligence...'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating conversation title:',
        expect.any(Error)
      )
      expect(updateConversationTitle).toHaveBeenCalledWith('conv-123', 'What is machine learning?')
      
      consoleErrorSpy.mockRestore()
    })

    it('deberia truncar mensajes largos del usuario en el titulo alternativo', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      generateConversationTitleSpy.mockRejectedValue(new Error('AI service unavailable'))
      updateConversationTitleSpy.mockResolvedValue()

      const longUserMessage = 'This is a very long user message that should be truncated because it exceeds the maximum length allowed for titles and needs to be shortened'

      await updateConversationTitleIntelligently(
        'conv-123',
        longUserMessage,
        'Some response'
      )

      expect(updateConversationTitle).toHaveBeenCalledWith('conv-123', 'This is a very long user message that should be...')
      
      consoleErrorSpy.mockRestore()
    })

    it('deberia manejar un mensaje de usuario vacio en el titulo alternativo', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      generateConversationTitleSpy.mockRejectedValue(new Error('AI service unavailable'))
      updateConversationTitleSpy.mockResolvedValue()

      await updateConversationTitleIntelligently(
        'conv-123',
        '',
        'Some response'
      )

      expect(updateConversationTitle).toHaveBeenCalledWith('conv-123', '')
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('esPrimerIntercambio', () => {
    it('deberia devolver verdadero cuando hay un solo mensaje', () => {
      expect(isFirstExchange(1)).toBe(true)
    })

    it('deberia devolver falso cuando hay mas de un mensaje', () => {
      expect(isFirstExchange(2)).toBe(false)
      expect(isFirstExchange(5)).toBe(false)
      expect(isFirstExchange(10)).toBe(false)
    })

    it('deberia devolver falso cuando hay cero mensajes', () => {
      expect(isFirstExchange(0)).toBe(false)
    })

    it('deberia manejar casos extremos', () => {
      expect(isFirstExchange(-1)).toBe(false)
      expect(isFirstExchange(1.5)).toBe(false)
    })
  })
})
