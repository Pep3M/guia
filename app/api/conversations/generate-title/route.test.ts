import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock dependencies
vi.mock('@/lib/database/prisma-server', () => ({
  prisma: {
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/ai/title-generation', () => ({
  generateConversationTitle: vi.fn(),
}))

const asMock = <T>(fn: T) => fn as unknown as Mock

describe('/api/conversations/generate-title', () => {
  const mockSession = {
    user: { id: 'user-123' },
  }

  const mockConversation = {
    id: 'conv-123',
    organization: {
      memberships: [{ userId: 'user-123' }],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deberia generar el titulo exitosamente', async () => {
    const { getSession } = await import('@/lib/auth/session')
    const { prisma } = await import('@/lib/database/prisma-server')
    const { generateConversationTitle } = await import('@/lib/ai/title-generation')

    asMock(getSession).mockResolvedValue(mockSession as any)
    asMock(prisma.conversation.findUnique).mockResolvedValue(mockConversation as any)
    asMock(generateConversationTitle).mockResolvedValue('Consulta sobre políticas')
    asMock(prisma.conversation.update).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123',
        userMessage: '¿Cuáles son las políticas?',
        assistantMessage: 'Las políticas incluyen...',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ title: 'Consulta sobre políticas' })
    expect(generateConversationTitle).toHaveBeenCalledWith(
      '¿Cuáles son las políticas?',
      'Las políticas incluyen...'
    )
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-123' },
      data: { title: 'Consulta sobre políticas' },
    })
  })

  it('deberia devolver 401 cuando no hay autenticacion', async () => {
    const { getSession } = await import('@/lib/auth/session')

    asMock(getSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123',
        userMessage: '¿Cuáles son las políticas?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'No autenticado' })
  })

  it('deberia devolver 400 cuando faltan campos requeridos', async () => {
    const { getSession } = await import('@/lib/auth/session')

    asMock(getSession).mockResolvedValue(mockSession as any)

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: '¿Cuáles son las políticas?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ 
      error: 'conversationId y userMessage son requeridos' 
    })
  })

  it('deberia devolver 404 cuando la conversacion no existe', async () => {
    const { getSession } = await import('@/lib/auth/session')
    const { prisma } = await import('@/lib/database/prisma-server')

    asMock(getSession).mockResolvedValue(mockSession as any)
    asMock(prisma.conversation.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123',
        userMessage: '¿Cuáles son las políticas?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({ error: 'Conversación no encontrada' })
  })

  it('deberia devolver 403 cuando el usuario no tiene acceso a la conversacion', async () => {
    const { getSession } = await import('@/lib/auth/session')
    const { prisma } = await import('@/lib/database/prisma-server')

    asMock(getSession).mockResolvedValue(mockSession as any)
    asMock(prisma.conversation.findUnique).mockResolvedValue({
      ...mockConversation,
      organization: {
        memberships: [], // No memberships
      },
    } as any)

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123',
        userMessage: '¿Cuáles son las políticas?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'No tienes acceso a esta conversación' })
  })

  it('deberia manejar los errores de forma adecuada', async () => {
    const { getSession } = await import('@/lib/auth/session')

    asMock(getSession).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/conversations/generate-title', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123',
        userMessage: '¿Cuáles son las políticas?',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
  })
})
