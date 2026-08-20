/**
 * Proveedor de modelos.
 *
 * Todo se configura por entorno contra una API compatible con OpenAI, que es
 * lo que exponen Ollama, vLLM, LM Studio, llama.cpp y la propia OpenAI. Por eso
 * autohospedar no requiere código distinto: sólo cambia AI_BASE_URL.
 */
import { createOpenAI } from '@ai-sdk/openai'
import OpenAI from 'openai'

/** Ej. http://localhost:11434/v1 (Ollama). Sin definir = API de OpenAI. */
const baseURL = process.env.AI_BASE_URL || undefined

// Los servidores locales no validan la clave, pero los clientes exigen una.
const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || 'not-needed'

export const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

/**
 * Debe coincidir con la dimensión declarada en la columna `Chunk.embedding`.
 * Cambiarla obliga a migrar la columna y reindexar los documentos.
 */
export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 1536)

const provider = createOpenAI({ baseURL, apiKey })

/** Modelo de chat para el AI SDK (streamText, generateText, ...). */
export const chatModel = () => provider(CHAT_MODEL)

// Perezoso a propósito: instanciarlo al importar el módulo obliga a tener
// credenciales presentes en cualquier contexto que sólo quiera leer CHAT_MODEL.
let client: OpenAI | undefined

/** Cliente para embeddings, que el AI SDK no cubre con la misma ergonomía. */
export function embeddingsClient(): OpenAI {
  client ??= new OpenAI({ baseURL, apiKey })
  return client
}
