import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embeddingsClient } from './provider'

/**
 * Un vector de dimensión distinta a la de la columna `Chunk.embedding` hace
 * fallar el INSERT con un error de Postgres poco legible. Fallamos antes y
 * explicando qué hay que ajustar.
 */
function assertDimensions(embedding: number[]): number[] {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `El modelo "${EMBEDDING_MODEL}" devuelve vectores de ${embedding.length} dimensiones, ` +
        `pero la base de datos espera ${EMBEDDING_DIMENSIONS}. Ajusta EMBEDDING_DIMENSIONS, ` +
        `migra la columna Chunk.embedding a vector(${embedding.length}) y reindexa los documentos.`
    )
  }

  return embedding
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await embeddingsClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return assertDimensions(response.data[0].embedding)
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await embeddingsClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map((item) => assertDimensions(item.embedding))
}
