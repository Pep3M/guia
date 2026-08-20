import { EMBEDDING_BATCH_SIZE, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embeddingsClient } from './provider'

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

/**
 * Genera embeddings en lotes.
 *
 * Un documento grande produce cientos de fragmentos, y mandarlos en una sola
 * petición es problemático fuera de la API de OpenAI: los servidores locales
 * tienen límites de tamaño de petición mucho más bajos y algunos ni siquiera
 * aceptan `input` como array. El troceo mantiene las peticiones pequeñas y
 * permite bajar el lote a 1 donde haga falta (EMBEDDING_BATCH_SIZE=1).
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const batchSize = Math.max(1, EMBEDDING_BATCH_SIZE)
  const embeddings: number[][] = []

  for (let start = 0; start < texts.length; start += batchSize) {
    const batch = texts.slice(start, start + batchSize)
    const response = await embeddingsClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.length === 1 ? batch[0] : batch,
    })

    if (response.data.length !== batch.length) {
      throw new Error(
        `El proveedor devolvió ${response.data.length} embeddings para un lote de ${batch.length}. ` +
          `Si usas un servidor local, prueba con EMBEDDING_BATCH_SIZE=1.`
      )
    }

    // El orden no está garantizado por la especificación: la respuesta trae
    // `index` justamente para poder recomponerlo.
    const ordered = [...response.data].sort((a, b) => a.index - b.index)

    for (const item of ordered) {
      embeddings.push(assertDimensions(item.embedding))
    }
  }

  return embeddings
}
