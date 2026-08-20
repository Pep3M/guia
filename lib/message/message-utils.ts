import { prisma } from '@/lib/database/prisma-server'
import type { UIMessage } from 'ai'

export interface MessageData {
  role: 'user' | 'assistant'
  content: string
  conversationId: string
  organizationId: string
  sources?: Array<{
    chunkId: string
    sourceId: string
    fileName: string
    excerpt: string
    similarity: number
  }>
}

/**
 * Extracts text content from a UI message
 */
export const extractMessageText = (message: UIMessage): string => {
  if (!message.parts) {
    return (message as any).content || ''
  }

  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string }).text)
    .join('')
}

/**
 * Saves a message to the database
 */
export const saveMessage = async (messageData: MessageData): Promise<void> => {
  await prisma.message.create({
    data: {
      role: messageData.role,
      content: messageData.content,
      conversationId: messageData.conversationId,
      organizationId: messageData.organizationId,
      sources: messageData.sources || [],
    },
  })
}

/**
 * Validates that the last message is from a user
 */
export const validateLastMessage = (messages: UIMessage[]): { isValid: boolean; error?: string } => {
  if (!messages || messages.length === 0) {
    return { isValid: false, error: 'No messages provided' }
  }

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user') {
    return { isValid: false, error: 'Last message must be from user' }
  }

  return { isValid: true }
}

/**
 * Extracts organization ID from message metadata
 */
export const extractOrganizationId = (message: UIMessage): string | null => {
  const metadata = message?.metadata as { organizationId?: string }
  return metadata?.organizationId || null
}
