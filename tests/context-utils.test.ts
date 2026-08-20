import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn(),
}))

vi.mock('@/lib/ai/vector-search', () => ({
  searchSimilarChunks: vi.fn(),
}))

vi.mock('@/lib/database/prisma-server', () => ({
  prisma: {
    knowledgeSource: {
      findMany: vi.fn(),
    },
  },
}))

let filterUsedSources: typeof import('@/lib/ai/context-utils')['filterUsedSources']

beforeAll(async () => {
  ;({ filterUsedSources } = await import('@/lib/ai/context-utils'))
})

describe('utilidades-de-contexto', () => {
  describe('filtrarFuentesUsadas', () => {
    it('deberia filtrar las fuentes citadas en la respuesta', () => {
      const sourcesMetadata = [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          fileName: 'doc1.pdf',
          excerpt: 'Content 1...',
          similarity: 0.9,
        },
        {
          chunkId: 'chunk-2',
          sourceId: 'source-2',
          fileName: 'doc2.pdf',
          excerpt: 'Content 2...',
          similarity: 0.8,
        },
        {
          chunkId: 'chunk-3',
          sourceId: 'source-3',
          fileName: 'doc3.pdf',
          excerpt: 'Content 3...',
          similarity: 0.7,
        },
      ]

      const responseText = 'Based on the information [1] and [3], here is the answer...'

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(sourcesMetadata[0])
      expect(result[1]).toEqual(sourcesMetadata[2])
    })

    it('deberia devolver un arreglo vacio cuando no hay fuentes citadas', () => {
      const sourcesMetadata = [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          fileName: 'doc1.pdf',
          excerpt: 'Content 1...',
          similarity: 0.9,
        },
      ]

      const responseText = 'This response does not cite any sources.'

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(0)
    })

    it('deberia manejar cuando todas las fuentes son citadas', () => {
      const sourcesMetadata = [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          fileName: 'doc1.pdf',
          excerpt: 'Content 1...',
          similarity: 0.9,
        },
        {
          chunkId: 'chunk-2',
          sourceId: 'source-2',
          fileName: 'doc2.pdf',
          excerpt: 'Content 2...',
          similarity: 0.8,
        },
      ]

      const responseText = 'Based on [1] and [2], here is the comprehensive answer.'

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(2)
      expect(result).toEqual(sourcesMetadata)
    })

    it('deberia manejar metadatos de fuentes vacios', () => {
      const sourcesMetadata: any[] = []
      const responseText = 'Some response text.'

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(0)
    })

    it('deberia manejar un texto de respuesta vacio', () => {
      const sourcesMetadata = [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          fileName: 'doc1.pdf',
          excerpt: 'Content 1...',
          similarity: 0.9,
        },
      ]

      const responseText = ''

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(0)
    })

    it('deberia manejar citas con distintos formatos', () => {
      const sourcesMetadata = [
        {
          chunkId: 'chunk-1',
          sourceId: 'source-1',
          fileName: 'doc1.pdf',
          excerpt: 'Content 1...',
          similarity: 0.9,
        },
        {
          chunkId: 'chunk-2',
          sourceId: 'source-2',
          fileName: 'doc2.pdf',
          excerpt: 'Content 2...',
          similarity: 0.8,
        },
      ]

      const responseText = 'According to [1] and also [2], the answer is clear.'

      const result = filterUsedSources(sourcesMetadata, responseText)

      expect(result).toHaveLength(2)
      expect(result).toEqual(sourcesMetadata)
    })
  })
})
