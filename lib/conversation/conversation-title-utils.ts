import { generateConversationTitle } from '@/lib/ai/title-generation'
import { updateConversationTitle } from '@/lib/conversation/conversation-utils'
import { buildFallbackTitle } from '@/lib/ai/prompt-utils'

/**
 * Updates conversation title intelligently using AI or fallback
 */
export const updateConversationTitleIntelligently = async (
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> => {
  try {
    // Generate an intelligent title using AI
    const title = await generateConversationTitle(userMessage, assistantMessage)
    await updateConversationTitle(conversationId, title)
  } catch (error) {
    console.error('Error updating conversation title:', error)
    
    // Fallback to simple title
    const fallbackTitle = buildFallbackTitle(userMessage)
    await updateConversationTitle(conversationId, fallbackTitle)
  }
}

/**
 * Checks if this is the first exchange in a conversation
 */
export const isFirstExchange = (messagesCount: number): boolean => {
  return messagesCount === 1
}
