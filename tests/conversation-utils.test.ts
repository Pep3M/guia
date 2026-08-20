import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  getOrCreateConversation, 
  getPreviousMessages, 
  updateConversationTitle 
} from '@/lib/conversation/conversation-utils'
import { prisma } from '@/lib/database/prisma-server'

// Mock Prisma
vi.mock('@/lib/database/prisma-server', () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('utilidades-de-conversacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('obtenerOCrearConversacion', () => {
    it('deberia devolver la conversacion existente cuando se proporciona el id', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test Conversation',
        organizationId: 'org-123',
        userId: 'user-123',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      }

      ;(prisma.conversation.findUnique as any).mockResolvedValue(mockConversation)

      const result = await getOrCreateConversation('conv-123', 'org-123', 'user-123')

      expect(result).toEqual({
        id: 'conv-123',
        title: 'Test Conversation',
        organizationId: 'org-123',
        userId: 'user-123',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      })
      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
      })
    })

    it('deberia lanzar error cuando la conversacion no existe', async () => {
      ;(prisma.conversation.findUnique as any).mockResolvedValue(null)

      await expect(
        getOrCreateConversation('conv-123', 'org-123', 'user-123')
      ).rejects.toThrow('Conversation not found')
    })

    it('deberia lanzar error cuando la conversacion pertenece a otra organizacion', async () => {
      const mockConversation = {
        id: 'conv-123',
        organizationId: 'org-456', // Different org
        userId: 'user-123',
        messages: [],
      }

      ;(prisma.conversation.findUnique as any).mockResolvedValue(mockConversation)

      await expect(
        getOrCreateConversation('conv-123', 'org-123', 'user-123')
      ).rejects.toThrow('No tienes acceso a esta conversación')
    })

    it('deberia crear una conversacion nueva cuando no se proporciona el id', async () => {
      const mockNewConversation = {
        id: 'conv-new',
        title: 'Nueva conversación',
        organizationId: 'org-123',
        userId: 'user-123',
      }

      ;(prisma.conversation.create as any).mockResolvedValue(mockNewConversation)

      const result = await getOrCreateConversation(undefined, 'org-123', 'user-123')

      expect(result).toEqual({
        id: 'conv-new',
        title: 'Nueva conversación',
        organizationId: 'org-123',
        userId: 'user-123',
        messages: [],
      })
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: {
          title: 'Nueva conversación',
          organizationId: 'org-123',
          userId: 'user-123',
        },
      })
    })
  })

  describe('obtenerMensajesPrevios', () => {
    it('deberia devolver los mensajes previos cuando la conversacion existe', async () => {
      const mockConversation = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      }

      ;(prisma.conversation.findUnique as any).mockResolvedValue(mockConversation)

      const result = await getPreviousMessages('conv-123')

      expect(result).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ])
    })

    it('deberia devolver un arreglo vacio cuando la conversacion no existe', async () => {
      ;(prisma.conversation.findUnique as any).mockResolvedValue(null)

      const result = await getPreviousMessages('conv-123')

      expect(result).toEqual([])
    })
  })

  describe('actualizarTituloDeConversacion', () => {
    it('deberia actualizar el titulo de la conversacion', async () => {
      ;(prisma.conversation.update as any).mockResolvedValue({})

      await updateConversationTitle('conv-123', 'New Title')

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: { title: 'New Title' },
      })
    })
  })
})
