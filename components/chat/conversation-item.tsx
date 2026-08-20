'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Conversation } from '@/lib/hooks/use-conversations'
import { useIsMobile } from '@/hooks/use-mobile'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: (conversationId: string) => void
  onDelete: (conversationId: string) => void
  isGeneratingTitle?: boolean
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 168) { // 7 días
    return date.toLocaleDateString('es-ES', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }
}

export const ConversationItem = ({ 
  conversation, 
  isActive, 
  onSelect, 
  onDelete,
  isGeneratingTitle 
}: ConversationItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const isMobile = useIsMobile()
  const showDelete = isMobile || isHovered

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start h-auto py-2 px-3 text-left group relative",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2 w-full min-w-0">
        <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className={cn(
            "text-sm truncate max-w-[200px]",
            isGeneratingTitle && "animate-pulse"
          )}>
            {conversation.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(conversation.updatedAt)}
          </span>
        </div>
        {showDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100 hover:bg-destructive/10 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </Button>
  )
}

