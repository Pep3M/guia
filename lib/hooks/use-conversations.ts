import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth/auth-client'
import { useState, useCallback } from 'react'

export interface Conversation {
  id: string
  title: string
  organizationId: string
  userId: string
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  conversationId: string
  organizationId: string
  createdAt: string
}

export interface CreateConversationData {
  title: string
  organizationId: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
}

// Hook para listar conversaciones de una organización
export const useConversations = (organizationId: string, currentConversationId?: string, streamingTitle?: string | null) => {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['conversations', organizationId],
    queryFn: async (): Promise<Conversation[]> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch(`/api/conversations?organizationId=${organizationId}`)
      if (!response.ok) throw new Error('Error al cargar conversaciones')
      
      return response.json()
    },
    enabled: !!session && !!organizationId,
    select: (data) => {
      // Si hay una conversación actual con título en streaming, actualizar su título
      if (currentConversationId && streamingTitle) {
        return data.map(conv => 
          conv.id === currentConversationId 
            ? { ...conv, title: streamingTitle }
            : conv
        )
      }
      return data
    },
  })
}

// Hook para obtener una conversación específica con sus mensajes
export const useConversation = (conversationId: string) => {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<ConversationWithMessages> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) throw new Error('Error al cargar conversación')
      
      return response.json()
    },
    enabled: !!session && !!conversationId,
  })
}

// Hook para cargar mensajes de una conversación con funcionalidad de generación de títulos
export const useConversationMessages = (conversationId: string) => {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [streamingTitle, setStreamingTitle] = useState<string | null>(null)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  
  const query = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!response.ok) throw new Error('Error al cargar mensajes')
      
      return response.json()
    },
    enabled: !!session && !!conversationId,
  })

  // Callback para generar título cuando se completa la primera respuesta
  const handleFirstResponseComplete = useCallback((conversationId: string, userMessage: string, assistantMessage?: string) => {
    setIsGeneratingTitle(true)
    setStreamingTitle('Generando título...')
    
    // Simular el proceso de generación de título
    setTimeout(() => {
      setStreamingTitle('Título generado')
      setTimeout(() => {
        setIsGeneratingTitle(false)
        setStreamingTitle(null)
        // Invalidar queries para refrescar la lista de conversaciones con el título final
        queryClient.invalidateQueries({
          queryKey: ['conversations']
        })
      }, 1000)
    }, 2000)
  }, [queryClient])

  return {
    ...query,
    streamingTitle,
    isGeneratingTitle,
    handleFirstResponseComplete,
  }
}

// Hook para crear una nueva conversación
export const useCreateConversation = () => {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  
  return useMutation({
    mutationFn: async (data: CreateConversationData): Promise<Conversation> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Error al crear conversación')
      
      return response.json()
    },
    onMutate: async (newConversationData) => {
      // Cancelar queries en progreso para evitar conflictos
      await queryClient.cancelQueries({
        queryKey: ['conversations', newConversationData.organizationId]
      })

      // Snapshot del valor anterior
      const previousConversations = queryClient.getQueryData(['conversations', newConversationData.organizationId])

      // Crear una conversación optimística temporal
      const optimisticConversation: Conversation = {
        id: `temp-${Date.now()}`,
        title: newConversationData.title,
        organizationId: newConversationData.organizationId,
        userId: session?.user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      }

      // Actualizar optimísticamente
      queryClient.setQueryData(['conversations', newConversationData.organizationId], (old: Conversation[] = []) => [
        optimisticConversation,
        ...old
      ])

      return { previousConversations, optimisticConversation }
    },
    onSuccess: (newConversation, variables, context) => {
      // Actualizar con los datos reales del servidor
      queryClient.setQueryData(['conversations', newConversation.organizationId], (old: Conversation[] = []) => 
        old.map(conv => 
          conv.id === context?.optimisticConversation.id 
            ? newConversation 
            : conv
        )
      )
    },
    onError: (err, variables, context) => {
      // Revertir en caso de error
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations', variables.organizationId], context.previousConversations)
      }
    },
  })
}

// Hook para eliminar una conversación
export const useDeleteConversation = () => {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  
  return useMutation({
    mutationFn: async ({ conversationId, organizationId }: { 
      conversationId: string
      organizationId: string 
    }): Promise<void> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Error al eliminar conversación')
    },
    onSuccess: (_, { organizationId }) => {
      // Invalidar y refetch la lista de conversaciones
      queryClient.invalidateQueries({
        queryKey: ['conversations', organizationId]
      })
    },
  })
}

// Hook para actualizar el título de una conversación
export const useUpdateConversationTitle = () => {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      title 
    }: { 
      conversationId: string
      title: string 
    }): Promise<Conversation> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      
      if (!response.ok) throw new Error('Error al actualizar conversación')
      
      return response.json()
    },
    onSuccess: (updatedConversation) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['conversations', updatedConversation.organizationId]
      })
      queryClient.invalidateQueries({
        queryKey: ['conversation', updatedConversation.id]
      })
    },
  })
}

// Hook para generar título automáticamente
export const useGenerateConversationTitle = () => {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  
  return useMutation({
    mutationFn: async ({ 
      conversationId,
      userMessage,
      assistantMessage 
    }: { 
      conversationId: string
      userMessage: string
      assistantMessage?: string
    }): Promise<{ title: string }> => {
      if (!session) throw new Error('No autenticado')
      
      const response = await fetch('/api/conversations/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          userMessage, 
          assistantMessage 
        }),
      })
      
      if (!response.ok) throw new Error('Error al generar título')
      
      return response.json()
    },
    onSuccess: (data, { conversationId }) => {
      // Invalidar queries para refrescar el título
      queryClient.invalidateQueries({
        queryKey: ['conversations']
      })
      queryClient.invalidateQueries({
        queryKey: ['conversation', conversationId]
      })
    },
  })
}
