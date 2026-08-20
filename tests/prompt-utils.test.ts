import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  buildSystemPrompt, 
  buildConversationContext, 
  buildFallbackTitle 
} from '@/lib/ai/prompt-utils'

describe('prompt-utils', () => {
  describe('buildConversationContext', () => {
    it('should build conversation context from previous messages', () => {
      const previousMessages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ]

      const result = buildConversationContext(previousMessages)

      expect(result).toContain('CONTEXTO DE CONVERSACIÓN ANTERIOR:')
      expect(result).toContain('Usuario: Hello')
      expect(result).toContain('Asistente: Hi there!')
      expect(result).toContain('Usuario: How are you?')
    })

    it('should return empty string when no previous messages', () => {
      const result = buildConversationContext([])

      expect(result).toBe('')
    })
  })

  describe('buildSystemPrompt', () => {
    it('should build complete system prompt with document and conversation context', () => {
      const documentContext = '[1] Source: doc1.pdf\nContent about topic A\n\n---\n\n[2] Source: doc2.pdf\nContent about topic B'
      const conversationContext = '\n\nCONTEXTO DE CONVERSACIÓN ANTERIOR:\nUsuario: Previous question\nAsistente: Previous answer\n'

      const result = buildSystemPrompt(documentContext, conversationContext)

      expect(result).toContain('Eres un asistente experto')
      expect(result).toContain('CONTEXTO DE DOCUMENTOS:')
      expect(result).toContain('[1] Source: doc1.pdf')
      expect(result).toContain('[2] Source: doc2.pdf')
      expect(result).toContain('CONTEXTO DE CONVERSACIÓN ANTERIOR:')
      expect(result).toContain('INSTRUCCIONES:')
      expect(result).toContain('Responde en español')
    })

    it('should build system prompt with only document context', () => {
      const documentContext = '[1] Source: doc1.pdf\nContent about topic A'
      const conversationContext = ''

      const result = buildSystemPrompt(documentContext, conversationContext)

      expect(result).toContain('CONTEXTO DE DOCUMENTOS:')
      expect(result).toContain('[1] Source: doc1.pdf')
      expect(result).not.toContain('CONTEXTO DE CONVERSACIÓN ANTERIOR:')
    })
  })

  describe('buildFallbackTitle', () => {
    it('should truncate long messages', () => {
      const longMessage = 'This is a very long message that should be truncated because it exceeds the maximum length allowed for titles'

      const result = buildFallbackTitle(longMessage)

      expect(result).toBe('This is a very long message that should be trun...')
      expect(result.length).toBe(50)
    })

    it('should return short messages as is', () => {
      const shortMessage = 'Short message'

      const result = buildFallbackTitle(shortMessage)

      expect(result).toBe('Short message')
    })

    it('should handle exactly 50 character messages', () => {
      const exactMessage = 'This message is exactly fifty characters long!'

      const result = buildFallbackTitle(exactMessage)

      expect(result).toBe('This message is exactly fifty characters long!')
    })

    it('should handle empty message', () => {
      const result = buildFallbackTitle('')

      expect(result).toBe('')
    })
  })
})
