import { prisma } from '@/lib/database/prisma-server'
import { Prisma } from '@prisma/client'

export interface SimilarChunk {
  id: string
  content: string
  metadata: Prisma.JsonValue
  sourceId: string
  similarity: number
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  organizationId: string,
  limit: number = 5,
  accessibleCategoryIds?: string[]
): Promise<SimilarChunk[]> {
  const vectorString = `[${queryEmbedding.join(',')}]`
  
  // Build WHERE clause based on category access
  // If accessibleCategoryIds is provided, filter by:
  // - Documents with categories in the accessible list
  // - Documents without any categories (accessible to all)
  // If accessibleCategoryIds is null/undefined, show all documents (OWNER/ADMIN)
  let categoryFilter: Prisma.Sql
  
  if (accessibleCategoryIds === undefined || accessibleCategoryIds === null) {
    // No filtering - show all documents (OWNER/ADMIN)
    categoryFilter = Prisma.empty
  } else if (accessibleCategoryIds.length === 0) {
    // User has no accessible categories - only show documents without categories
    categoryFilter = Prisma.sql`
      AND NOT EXISTS (
        SELECT 1 FROM "KnowledgeSourceCategory" ksc 
        WHERE ksc."sourceId" = ks.id
      )
    `
  } else {
    // User has accessible categories - show documents with accessible categories OR no categories
    // Use Prisma.join to safely build the IN clause
    categoryFilter = Prisma.sql`
      AND (
        EXISTS (
          SELECT 1 FROM "KnowledgeSourceCategory" ksc 
          WHERE ksc."sourceId" = ks.id 
          AND ksc."categoryId" IN (${Prisma.join(
            accessibleCategoryIds.map((categoryId): Prisma.Sql => Prisma.sql`${categoryId}`)
          )})
        )
        OR NOT EXISTS (
          SELECT 1 FROM "KnowledgeSourceCategory" ksc 
          WHERE ksc."sourceId" = ks.id
        )
      )
    `
  }
  
  const results = await prisma.$queryRaw<SimilarChunk[]>`
    SELECT 
      c.id::text, 
      c.content, 
      c.metadata, 
      c."sourceId"::text,
      1 - (c.embedding <=> ${vectorString}::vector) as similarity
    FROM "Chunk" c
    INNER JOIN "KnowledgeSource" ks ON c."sourceId" = ks.id
    WHERE c.embedding IS NOT NULL
      AND c."organizationId" = ${organizationId}
      AND ks.status = 'completed'
      ${categoryFilter}
    ORDER BY c.embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `
  
  return results
}

