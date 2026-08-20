import { streamText, UIMessage, convertToModelMessages } from 'ai'
import { getSession } from '@/lib/auth/session'
import { validateChatRequest } from '@/lib/auth/auth-server'
import { getOrCreateConversation } from '@/lib/conversation/conversation-utils'
import { 
  extractMessageText, 
  validateLastMessage, 
  extractOrganizationId, 
  saveMessage 
} from '@/lib/message/message-utils'
import { generateDocumentContext, filterUsedSources } from '@/lib/ai/context-utils'
import { buildSystemPrompt, buildConversationContext } from '@/lib/ai/prompt-utils'
import { updateConversationTitleIntelligently, isFirstExchange } from '@/lib/conversation/conversation-title-utils'
import { checkLimits, checkUserLimits } from '@/lib/ai/limit-validator'
import { calculateTokens, calculateCost } from '@/lib/ai/token-calculator'
import { trackTokenUsage } from '@/lib/ai/token-tracker'
import { getUserAccessibleCategories } from '@/lib/auth/category-access'
import { prisma } from '@/lib/database/prisma-server'
import { CHAT_MODEL, chatModel } from '@/lib/ai/provider'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const session = await getSession()

    const body = await req.json()
    const { messages, conversationId }: { 
      messages: UIMessage[]
      conversationId?: string
    } = body

    // Validate messages
    const messageValidation = validateLastMessage(messages)
    if (!messageValidation.isValid) {
      return new Response(messageValidation.error, { status: 400 })
    }

    // Extract organization ID from the last message metadata
    const lastUserMessage = messages[messages.length - 1]
    const organizationId = extractOrganizationId(lastUserMessage)

    if (!organizationId) {
      return new Response('Organization ID is required', { status: 400 })
    }

    if (!session) {
      return new Response('No autenticado', { status: 401 })
    }

    // Validate user access
    const accessValidation = await validateChatRequest(session, organizationId)
    if (!accessValidation.isValid) {
      return new Response(accessValidation.error, { status: accessValidation.status })
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(
      conversationId,
      organizationId,
      session.user.id
    )

    // Extract text from the last message
    const lastMessageText = extractMessageText(lastUserMessage)

    // Calculate estimated tokens for the request WITHOUT embeddings
    // We use a conservative estimate for the system prompt since we don't know the context yet
    const allMessages = convertToModelMessages(messages)
    const messagesText = allMessages.map((m) => m.content).join(' ')
    // Estimate: ~5000 tokens for max context + messages
    const estimatedTokens = calculateTokens(messagesText, CHAT_MODEL) + 5000

    // Check organization limits before processing ANY AI operations
    const limitCheck = await checkLimits(organizationId, estimatedTokens)
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Límite de uso alcanzado',
          reason: limitCheck.reason,
          usage: limitCheck.usage,
          limits: limitCheck.limits,
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check user limits before processing ANY AI operations
    const userLimitCheck = await checkUserLimits(organizationId, session.user.id, estimatedTokens)
    if (!userLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Límite de tokens alcanzado',
          reason: userLimitCheck.reason,
          usage: userLimitCheck.usage,
          limits: userLimitCheck.limits,
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user's accessible categories (for MEMBER role, this filters by group access)
    // OWNER/ADMIN will get undefined which means access to all categories
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
      select: {
        role: true,
      },
    })

    let accessibleCategoryIds: string[] | undefined
    if (membership && (membership.role === 'OWNER' || membership.role === 'ADMIN')) {
      // OWNER/ADMIN have access to all categories (undefined = no filter)
      accessibleCategoryIds = undefined
    } else {
      // MEMBER: get accessible categories from groups
      accessibleCategoryIds = await getUserAccessibleCategories(session.user.id, organizationId)
    }

    // NOW we can safely generate document context (embeddings)
    const documentContext = await generateDocumentContext(
      lastMessageText,
      organizationId,
      5,
      accessibleCategoryIds
    )

    // Build conversation context
    const conversationContext = buildConversationContext(conversation.messages)

    // Build system prompt
    const systemPrompt = buildSystemPrompt(documentContext.context, conversationContext)

    // Save user message
    await saveMessage({
      role: 'user',
      content: lastMessageText,
      conversationId: conversation.id,
      organizationId,
    })

    // Stream the response
    const result = streamText({
      model: chatModel(),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      onFinish: async ({ text, usage }) => {
        // Filter sources that were actually cited in the response
        const usedSources = filterUsedSources(documentContext.sourcesMetadata, text)

        // Save assistant message with only used sources
        await saveMessage({
          role: 'assistant',
          content: text,
          sources: usedSources,
          conversationId: conversation.id,
          organizationId,
        })

        // Track token usage (use actual tokens from usage object if available)
        const tokensInput = usage?.inputTokens || estimatedTokens
        const tokensOutput = usage?.outputTokens || calculateTokens(text, CHAT_MODEL)
        const costUSD = calculateCost(tokensInput, tokensOutput, CHAT_MODEL)

        await trackTokenUsage({
          organizationId,
          userId: session.user.id,
          operation: 'chat',
          tokensInput,
          tokensOutput,
          model: CHAT_MODEL,
          costUSD,
        })

        // Update conversation title if it's the first exchange
        if (isFirstExchange(messages.length)) {
          await updateConversationTitleIntelligently(
            conversation.id,
            lastMessageText,
            text
          )
        }
      },
    })

    return result.toUIMessageStreamResponse({
      messageMetadata: () => ({
        // Send all potential sources - frontend will filter based on citations
        sources: documentContext.sourcesMetadata,
        conversationId: conversation.id,
      }),
    })
  } catch (error) {
    console.error('Chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

