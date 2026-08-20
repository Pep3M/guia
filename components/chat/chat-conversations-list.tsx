'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, Plus, Search, X } from 'lucide-react'
import { useConversations, useDeleteConversation } from '@/lib/hooks/use-conversations'
import { ConversationItem } from './conversation-item'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ChatConversationsListProps {
  organizationId: string
  currentConversationId?: string
  orgSlug: string
  streamingTitle?: string | null
  isGeneratingTitle?: boolean
}

export const ChatConversationsList = ({
  organizationId,
  currentConversationId,
  orgSlug,
  streamingTitle,
  isGeneratingTitle
}: ChatConversationsListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const router = useRouter()

  const { data: conversations, isLoading } = useConversations(organizationId, currentConversationId, streamingTitle)
  const deleteConversation = useDeleteConversation()

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    if (!searchQuery.trim()) return conversations
    
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])

  const handleNewConversation = () => {
    // Navigate to chat without conversationId
    // The conversation will be created automatically when the first message is sent
    router.push(`/${orgSlug}/chat`)
  }

  const handleConversationSelect = (conversationId: string) => {
    router.push(`/${orgSlug}/chat?conversationId=${conversationId}`)
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
      try {
        await deleteConversation.mutateAsync({
          conversationId,
          organizationId,
        })
        
        // If deleting the active conversation, navigate back to chat without conversationId
        if (conversationId === currentConversationId) {
          router.push(`/${orgSlug}/chat`)
        }
      } catch (error) {
        console.error('Error deleting conversation:', error)
      }
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border shrink-0">
        <History className="h-4 w-4" />
        <span className="text-sm font-medium">Conversaciones</span>
      </div>

      {/* Search and New Conversation */}
      <div className="p-2 border-b border-sidebar-border shrink-0">
        {isSearchOpen ? (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={() => {
                setIsSearchOpen(false)
                setSearchQuery('')
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsSearchOpen(true)}
              size="sm"
              variant="outline"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleNewConversation}
              size="sm"
              variant="default"
              className="flex-1 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">Nueva conversación</span>
            </Button>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                onSelect={handleConversationSelect}
                onDelete={handleDeleteConversation}
                isGeneratingTitle={isGeneratingTitle && conversation.id === currentConversationId}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

