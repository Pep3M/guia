'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { Message, MessageContent, MessageAvatar, MessageActions as MessageActionsContainer } from '@/components/ai-elements/message'
import { PromptInput, PromptInputTextarea, PromptInputSubmit, PromptInputFooter } from '@/components/ai-elements/prompt-input'
import { Actions, Action } from '@/components/ai-elements/actions'
import { Response } from '@/components/ai-elements/response'
import { useOrganization } from '@/lib/hooks/use-organization'
import { useConversationMessages } from '@/lib/hooks/use-conversations'
import { SourcesAccordion } from '@/components/chat/sources-accordion'
import { OrganizationLoadingView } from '@/components/chat/organization-loading-view'
import { OrganizationNotFoundView } from '@/components/chat/organization-not-found-view'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Copy, Share, Sparkles } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { cn } from '@/lib/utils'
import { useSession } from '@/lib/auth/auth-client'
import { ChatEmptyState } from '@/components/chat/chat-empty-state'
import { OrganizationLoader } from '@/components/commons/loaders/organization-loader'

export default function ChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const orgSlug = params.org as string

  const { data: session } = useSession()
  const user = session?.user

  // Get conversationId from search params
  const currentConversationId = searchParams.get('conversationId')

  // Use the custom hook to manage organization data
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganization(orgSlug)

  // Load messages from current conversation if exists
  const {
    data: conversationMessages,
    streamingTitle,
    isGeneratingTitle,
    handleFirstResponseComplete
  } = useConversationMessages(currentConversationId || '')

  const { messages, sendMessage, setMessages, status, error } = useChat({
    onFinish: (message) => {
      // Update conversation ID from metadata if it's a new conversation
      const metadata = (message as any).metadata as { conversationId?: string }
      if (metadata?.conversationId && !currentConversationId) {
        // Navigate to the new conversation using search params
        router.push(`/${orgSlug}/chat?conversationId=${metadata.conversationId}`)
      }

      // Call the title generation callback if this is the first exchange (2 messages: user + assistant)
      if (metadata?.conversationId && messages.length === 2) {
        const userMessage = messages.find(m => m.role === 'user')
        const userMessageText = userMessage?.parts
          ?.filter((part) => part.type === 'text')
          ?.map((part) => (part as { type: 'text'; text: string }).text)
          ?.join('') || ''

        handleFirstResponseComplete(metadata.conversationId, userMessageText)
      }
    },
  })

  console.log('error', error)

  // Ref para scroll automático al final
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Ref para rastrear si estamos creando una nueva conversación
  const isCreatingNewConversationRef = useRef(false)
  
  // Ref para rastrear el conversationId anterior
  const previousConversationIdRef = useRef<string | null>(null)

  // Auto-scroll cuando cambian los mensajes o durante streaming
  useEffect(() => {
    // Pequeño delay para asegurar que el DOM se actualice
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 10)
    
    return () => clearTimeout(timeoutId)
  }, [messages.length, messages])

  // Clear messages when manually navigating to a new conversation (clicking "New Conversation")
  useEffect(() => {
    // Store the previous value before updating
    const previousId = previousConversationIdRef.current
    
    // If we're navigating from a conversation with an ID to no ID (clicking "New Conversation")
    if (previousId && !currentConversationId && !isCreatingNewConversationRef.current) {
      setMessages([])
    }
    
    // Update previous conversation ID
    previousConversationIdRef.current = currentConversationId
  }, [currentConversationId, setMessages])

  // Load conversation messages when conversation changes
  useEffect(() => {
    // Only update messages if we have loaded messages from the database
    // and if we're not in the middle of creating a new conversation
    if (conversationMessages && conversationMessages.length > 0 && !isCreatingNewConversationRef.current) {
      const uiMessages = conversationMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content }],
        metadata: {
          sources: msg.sources,
          conversationId: msg.conversationId,
        },
      }))
      setMessages(uiMessages)
    }
    // Reset flag when conversation messages are loaded
    if (conversationMessages && conversationMessages.length > 0) {
      isCreatingNewConversationRef.current = false
    }
    // Don't clear messages when switching to a conversation that hasn't loaded yet
    // This prevents the flickering effect when navigating to a new conversation
  }, [conversationMessages, currentConversationId, setMessages])

  // Intercept fetch calls to /api/chat to show notifications for token limit errors
  useEffect(() => {
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const [url, ...rest] = args
      const response = await originalFetch(url, ...rest)
      
      // Only intercept /api/chat responses with 429 status
      if (typeof url === 'string' && url.includes('/api/chat') && response.status === 429) {
        try {
          const clonedResponse = response.clone()
          const errorData = await clonedResponse.json().catch(() => null)
          if (errorData?.error === 'Límite de tokens alcanzado' && errorData?.reason) {
            toast.error('Límite de tokens alcanzado', {
              description: errorData.reason,
              duration: 8000,
            })
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
      }
      
      return response
    }
    
    // Cleanup: restore original fetch on unmount
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const handleSubmit = async (message: { text?: string; files?: any[] }, event: React.FormEvent) => {
    const messageText = message.text?.trim()
    if (!messageText || !organization?.id) return

    try {
      // Set flag to prevent clearing messages during navigation if this is a new conversation
      if (!currentConversationId) {
        isCreatingNewConversationRef.current = true
      }

      // Send message - the backend will create the conversation automatically if conversationId is undefined
      await sendMessage({
        text: messageText,
        metadata: {
          organizationId: organization.id,
          conversationId: currentConversationId || undefined,
        }
      })
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Try to extract error message from response
      if (error?.response || error?.data) {
        try {
          const errorData = error.response ? await error.response.json() : error.data
          if (errorData?.error === 'Límite de tokens alcanzado' && errorData?.reason) {
            toast.error('Límite de tokens alcanzado', {
              description: errorData.reason,
              duration: 8000,
            })
            isCreatingNewConversationRef.current = false
            return
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
        }
      }
      
      toast.error('Error al enviar el mensaje')
      // Reset flag on error
      isCreatingNewConversationRef.current = false
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit({ text: suggestion }, {} as React.FormEvent)
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('Mensaje copiado al portapapeles')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error('Error al copiar el mensaje')
    }
  }

  const handleShare = async (messageId: string, content: string) => {
    try {
      // Generate shareable URL for the message
      const shareUrl = `${window.location.origin}/${orgSlug}/chat?message=${messageId}`

      if (navigator.share) {
        // Use native share API if available
        await navigator.share({
          title: 'Mensaje del Chat',
          text: content,
          url: shareUrl,
        })
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Enlace del mensaje copiado al portapapeles')
      }
    } catch (error) {
      console.error('Error sharing message:', error)
      toast.error('Error al compartir el mensaje')
    }
  }

  const handleLike = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'positive' }),
      })
      // TODO: Show toast notification
    } catch (error) {
      console.error('Error sending feedback:', error)
    }
  }

  const handleDislike = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: 'negative' }),
      })
      // TODO: Show toast notification
    } catch (error) {
      console.error('Error sending feedback:', error)
    }
  }

  // Show loading view while organization is being fetched
  if (orgLoading) {
    return <OrganizationLoader />
  }

  // Show not found view if organization doesn't exist or user doesn't have access
  if (orgError || !organization) {
    return <OrganizationNotFoundView orgSlug={orgSlug} />
  }

  const lastAssistantMessage = messages.findLast((message) => message.role === 'assistant')
  const lastMessageTextPart = lastAssistantMessage?.parts.findLast((part) => part.type === 'text')
  const hasAssistantText = lastAssistantMessage && lastMessageTextPart && lastMessageTextPart.text.length > 0

  return (
    <div className="flex flex-col h-full">
      
      {/* Sugerencias si es conversación nueva */}
      {messages.length === 0 && (
        <ChatEmptyState
          onSuggestionClick={handleSuggestionClick}
        />
      )}

      {/* Conversación con AI Elements */}
      <div className="flex-1 min-h-0 px-6 overflow-y-auto">
        <div className="h-full max-w-3xl mx-auto space-y-6">
          {messages.map((message) => {
            const metadata = message.metadata as { sources?: any[] } | undefined
            const sources = metadata?.sources || []

            // Extract text from message parts
            const messageText = message.parts
              .filter((part) => part.type === 'text')
              .map((part) => (part as { type: 'text'; text: string }).text)
              .join('')

            // Filter sources that are actually cited in the message
            const citedSources = sources.filter((_, index) => {
              const citation = `[${index + 1}]`
              return messageText.includes(citation)
            })

            // Only show sources when message is complete (has ID which means it's not streaming)
            const isMessageComplete = message.id && messageText.length > 0
            const sourcesToShow = isMessageComplete ? citedSources : []

            if (message.role === 'assistant' && messageText.length === 0) {
              return null
            }

            return (
              <Message key={message.id} from={message.role}>
                <div className={cn("flex gap-2 relative", message.role === 'user' ? 'flex-row-reverse' : '')}>
                  {message.role === 'user' ? <MessageAvatar
                    src={user?.image || ''}
                    name={message.role === 'user' ? user?.name || 'Usuario' : 'Asistente'}
                  /> : (
                    // sparks avatar icon from lucide react
                    <Sparkles className="size-6 text-primary" />
                  )}
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Response key={`${message.id}-${i}`}>
                              {part.text}
                            </Response>
                          )
                        default:
                          return null
                      }
                    })}

                    {/* Mostrar sources solo para mensajes del asistente */}
                    {sourcesToShow && message.role === 'assistant' && sources.length > 0 && (
                      <SourcesAccordion sources={citedSources} className="mt-4" />
                    )}
                  </MessageContent>

                  {/* Actions fuera del contenido del mensaje */}
                  {isMessageComplete && (
                    <MessageActionsContainer className={cn("absolute -bottom-10", message.role === 'user' ? 'right-10' : 'left-10')}>
                      <Actions>
                        <Action
                          tooltip="Copiar mensaje"
                          onClick={() => handleCopy(messageText)}
                        >
                          <Copy className="size-4" />
                        </Action>
                        <Action
                          tooltip="Compartir mensaje"
                          onClick={() => handleShare(message.id, messageText)}
                        >
                          <Share className="size-4" />
                        </Action>
                      </Actions>
                    </MessageActionsContainer>
                  )}
                </div>
              </Message>
            )
          })}

          {/* Loader cuando está generando respuesta */}
          {status === 'submitted' || (!hasAssistantText && messages.length > 0) ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Generando tu respuesta...</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
          
          {/* Elemento de referencia para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input con AI Elements */}
      <div className="border-t border-border bg-background/95 backdrop-blur p-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputFooter>
              <PromptInputTextarea placeholder="Escribe tu pregunta..." />
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
