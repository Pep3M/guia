import { prisma } from '@/lib/database/prisma-server'

export interface ConversationData {
  id: string
  title: string
  organizationId: string
  userId: string
  messages: Array<{
    role: string
    content: string
  }>
}

export interface PreviousMessage {
  role: string
  content: string
}

/**
 * Gets an existing conversation or creates a new one
 */
export const getOrCreateConversation = async (
  conversationId: string | undefined,
  organizationId: string,
  userId: string
): Promise<ConversationData> => {
  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Últimos 20 mensajes para contexto
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify conversation belongs to organization
    if (conversation.organizationId !== organizationId) {
      throw new Error('No tienes acceso a esta conversación')
    }

    return {
      id: conversation.id,
      title: conversation.title,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    }
  } else {
    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        title: 'Nueva conversación',
        organizationId,
        userId,
      },
    })

    return {
      id: conversation.id,
      title: conversation.title,
      organizationId: conversation.organizationId,
      userId: conversation.userId,
      messages: [],
    }
  }
}

/**
 * Gets previous messages from a conversation
 */
export const getPreviousMessages = async (conversationId: string): Promise<PreviousMessage[]> => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 20,
      },
    },
  })

  if (!conversation) {
    return []
  }

  return conversation.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Updates conversation title
 */
export const updateConversationTitle = async (
  conversationId: string,
  title: string
): Promise<void> => {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { title },
  })
}
