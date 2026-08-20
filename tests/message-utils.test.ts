import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  extractMessageText, 
  validateLastMessage, 
  extractOrganizationId 
} from '@/lib/message/message-utils'
import type { UIMessage } from 'ai'

describe('message-utils', () => {
  describe('extractMessageText', () => {
    it('should extract text from message parts', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello world' },
          { type: 'text', text: ' How are you?' },
        ],
      } as UIMessage

      const result = extractMessageText(message)

      expect(result).toBe('Hello world How are you?')
    })

    it('should return content when no parts available', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello world',
      } as unknown as UIMessage

      const result = extractMessageText(message)

      expect(result).toBe('Hello world')
    })

    it('should return empty string when no content or parts', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'user',
      } as UIMessage

      const result = extractMessageText(message)

      expect(result).toBe('')
    })

    it('should filter only text parts', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello' },
          { type: 'image', image: 'base64data' },
          { type: 'text', text: ' world' },
        ],
      } as UIMessage

      const result = extractMessageText(message)

      expect(result).toBe('Hello world')
    })
  })

  describe('validateLastMessage', () => {
    it('should return valid when last message is from user', () => {
      const messages: UIMessage[] = [
        { id: 'msg-1', role: 'assistant', content: 'Hello' } as unknown as UIMessage,
        { id: 'msg-2', role: 'user', content: 'Hi' } as unknown as UIMessage,
      ]

      const result = validateLastMessage(messages)

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return invalid when last message is not from user', () => {
      const messages: UIMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Hello' } as unknown as UIMessage,
        { id: 'msg-2', role: 'assistant', content: 'Hi' } as unknown as UIMessage,
      ]

      const result = validateLastMessage(messages)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Last message must be from user')
    })

    it('should return invalid when no messages provided', () => {
      const result = validateLastMessage([])

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('No messages provided')
    })

    it('should return invalid when messages is null', () => {
      const result = validateLastMessage(null as any)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('No messages provided')
    })

    it('should return invalid when last message is null', () => {
      const messages: UIMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Hello' } as unknown as UIMessage,
        null as any,
      ]

      const result = validateLastMessage(messages)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Last message must be from user')
    })
  })

  describe('extractOrganizationId', () => {
    it('should extract organization ID from metadata', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        metadata: { organizationId: 'org-123' },
      } as unknown as UIMessage

      const result = extractOrganizationId(message)

      expect(result).toBe('org-123')
    })

    it('should return null when no metadata', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      } as unknown as UIMessage

      const result = extractOrganizationId(message)

      expect(result).toBeNull()
    })

    it('should return null when no organizationId in metadata', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        metadata: { otherField: 'value' },
      } as unknown as UIMessage

      const result = extractOrganizationId(message)

      expect(result).toBeNull()
    })

    it('should return null when metadata is null', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        metadata: null,
      } as unknown as UIMessage

      const result = extractOrganizationId(message)

      expect(result).toBeNull()
    })
  })
})
