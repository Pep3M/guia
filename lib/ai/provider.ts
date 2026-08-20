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

/** Fragmentos por petición de embeddings. Bájalo a 1 si tu servidor local no acepta lotes. */
export const EMBEDDING_BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 32)

/**
 * Fragmentos de documento que se inyectan como contexto en cada respuesta.
 *
 * Es el parámetro a bajar si el modelo tiene una ventana de contexto pequeña:
 * cada fragmento son unos 800 caracteres (~200 tokens). Con la ventana por
 * defecto de Ollama (4096 tokens) más de 5 fragmentos empieza a apretar.
 */
export const RAG_MAX_CHUNKS = Number(process.env.RAG_MAX_CHUNKS || 5)

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
