import { generateEmbedding } from '@/lib/ai/embeddings'
import { searchSimilarChunks } from '@/lib/ai/vector-search'
import { prisma } from '@/lib/database/prisma-server'

export interface DocumentContext {
  context: string
  sourcesMetadata: Array<{
    chunkId: string
    sourceId: string
    fileName: string
    excerpt: string
    similarity: number
  }>
}

export interface Source {
  id: string
  fileName: string
}

export interface Chunk {
  id: string
  content: string
  sourceId: string
  similarity: number
}

/**
 * Generates document context from a query text
 * @param queryText - The query text to search for
 * @param organizationId - The organization ID
 * @param maxChunks - Maximum number of chunks to return
 * @param accessibleCategoryIds - Array of category IDs the user can access. If undefined, shows all (OWNER/ADMIN)
 */
export const generateDocumentContext = async (
  queryText: string,
  organizationId: string,
  maxChunks: number = 5,
  accessibleCategoryIds?: string[]
): Promise<DocumentContext> => {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText)

  // Search for similar chunks (filtered by organization and accessible categories)
  const similarChunks = await searchSimilarChunks(queryEmbedding, organizationId, maxChunks, accessibleCategoryIds)

  // Get source information
  const sourceIds = [...new Set(similarChunks.map((chunk) => chunk.sourceId))]
  const sources = await prisma.knowledgeSource.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, fileName: true },
  })

  // Build context from chunks
  const context = similarChunks
    .map((chunk, index) => {
      const source = sources.find((s) => s.id === chunk.sourceId)
      return `[${index + 1}] Source: ${source?.fileName || 'Unknown'}
${chunk.content}`
    })
    .join('\n\n---\n\n')

  // Build sources metadata
  const sourcesMetadata = similarChunks.map((chunk) => {
    const source = sources.find((s) => s.id === chunk.sourceId)
    return {
      chunkId: chunk.id,
      sourceId: chunk.sourceId,
      fileName: source?.fileName || 'Unknown',
      excerpt: chunk.content.substring(0, 200) + '...',
      similarity: chunk.similarity,
    }
  })

  return {
    context,
    sourcesMetadata,
  }
}

/**
 * Filters sources that were actually cited in the response
 */
export const filterUsedSources = (
  sourcesMetadata: DocumentContext['sourcesMetadata'],
  responseText: string
): DocumentContext['sourcesMetadata'] => {
  return sourcesMetadata.filter((_, index) => {
    const citation = `[${index + 1}]`
    return responseText.includes(citation)
  })
}
