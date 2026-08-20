/**
 * Diagnóstico del entorno.
 *
 *   bun run doctor
 *
 * Comprueba, contra los servicios reales configurados, las cuatro cosas que
 * rompen una instalación autohospedada: la base de datos con pgvector, el
 * modelo de chat, el modelo de embeddings (y su dimensión) y el almacenamiento
 * de archivos.
 *
 * Está pensado para ejecutarse en el servidor después de instalar, antes de
 * dar el sistema por bueno.
 */
import {
  CHAT_MODEL,
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  RAG_MAX_CHUNKS,
  chatModel,
} from '@/lib/ai/provider'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { prisma } from '@/lib/database/prisma-server'
import { deleteFile, putFile, storageDriver } from '@/lib/storage'

type Status = 'ok' | 'warn' | 'fail'

interface Result {
  name: string
  status: Status
  detail: string
  hint?: string
}

const results: Result[] = []

const record = (name: string, status: Status, detail: string, hint?: string) => {
  results.push({ name, status, detail, hint })
  const icon = status === 'ok' ? '✔' : status === 'warn' ? '!' : '✖'
  console.log(`${icon}  ${name}: ${detail}`)
  if (hint) {
    console.log(`   → ${hint}`)
  }
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error) {
    record('Base de datos', 'fail', message(error), 'Revisa DATABASE_URL')
    return
  }

  const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname FROM pg_extension WHERE extname = 'vector'
  `

  if (extensions.length === 0) {
    record(
      'Base de datos',
      'fail',
      'conecta, pero la extensión pgvector no está instalada',
      'CREATE EXTENSION vector; o usa la imagen pgvector/pgvector'
    )
    return
  }

  const columns = await prisma.$queryRaw<Array<{ atttypmod: number }>>`
    SELECT a.atttypmod
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'Chunk' AND a.attname = 'embedding'
  `

  const columnDimensions = columns[0]?.atttypmod

  if (columnDimensions && columnDimensions !== EMBEDDING_DIMENSIONS) {
    record(
      'Base de datos',
      'fail',
      `la columna Chunk.embedding es vector(${columnDimensions}) pero EMBEDDING_DIMENSIONS es ${EMBEDDING_DIMENSIONS}`,
      'Ver "Cambiar el modelo de embeddings" en docs/self-hosting.md'
    )
    return
  }

  record('Base de datos', 'ok', `pgvector presente, Chunk.embedding vector(${columnDimensions})`)
}

async function checkChatModel() {
  const { generateText } = await import('ai')

  try {
    const started = Date.now()
    const { text } = await generateText({
      model: chatModel(),
      prompt: 'Responde únicamente con la palabra: listo',
    })
    const elapsed = Date.now() - started

    if (elapsed > 20_000) {
      record(
        'Modelo de chat',
        'warn',
        `"${CHAT_MODEL}" respondió en ${(elapsed / 1000).toFixed(1)} s`,
        'Tan lento hace incómodo el uso diario. Revisa si el modelo está corriendo en GPU'
      )
      return
    }

    record(
      'Modelo de chat',
      'ok',
      `"${CHAT_MODEL}" respondió en ${(elapsed / 1000).toFixed(1)} s (${text.trim().slice(0, 40)})`
    )
  } catch (error) {
    record(
      'Modelo de chat',
      'fail',
      message(error),
      `Comprueba AI_BASE_URL y que el modelo "${CHAT_MODEL}" exista en el proveedor`
    )
  }
}

async function checkEmbeddings() {
  try {
    const vectors = await generateEmbeddings(['prueba de diagnóstico', 'segundo fragmento'])

    if (vectors.length !== 2) {
      record(
        'Embeddings',
        'fail',
        `se pidieron 2 vectores y llegaron ${vectors.length}`,
        'Prueba con EMBEDDING_BATCH_SIZE=1'
      )
      return
    }

    record(
      'Embeddings',
      'ok',
      `"${EMBEDDING_MODEL}" devuelve ${vectors[0].length} dimensiones, lotes de ${EMBEDDING_BATCH_SIZE}`
    )
  } catch (error) {
    const detail = message(error)
    record(
      'Embeddings',
      'fail',
      detail,
      detail.includes('dimensiones')
        ? 'Ajusta EMBEDDING_DIMENSIONS y migra la columna Chunk.embedding'
        : `Comprueba que el modelo "${EMBEDDING_MODEL}" esté descargado; si el error es de lote, usa EMBEDDING_BATCH_SIZE=1`
    )
  }
}

async function checkContextWindow() {
  // Ollama recorta el contexto a num_ctx (4096 por defecto) sin avisar. Se le
  // manda un texto largo con una clave al principio: si el modelo no la
  // recuerda, el prompt se truncó y el RAG dará respuestas pobres en silencio.
  const needle = 'ZANAHORIA-7714'
  const filler = 'Este párrafo es relleno para ocupar la ventana de contexto. '.repeat(400)

  try {
    const { generateText } = await import('ai')
    const { text } = await generateText({
      model: chatModel(),
      prompt: `La clave secreta es ${needle}.\n\n${filler}\n\n¿Cuál era la clave secreta? Responde sólo con la clave.`,
    })

    if (text.includes(needle)) {
      record('Ventana de contexto', 'ok', 'el modelo conserva ~6.000 tokens de contexto')
      return
    }

    record(
      'Ventana de contexto',
      'warn',
      'el modelo perdió información del principio del prompt',
      'Con Ollama, súbela creando el modelo con "PARAMETER num_ctx 8192" (ver docker/ollama/Modelfile.chat) ' +
        `o baja RAG_MAX_CHUNKS (ahora ${RAG_MAX_CHUNKS})`
    )
  } catch (error) {
    record('Ventana de contexto', 'warn', `no se pudo comprobar: ${message(error)}`)
  }
}

async function checkStorage() {
  const key = `diagnostico/doctor-${Date.now()}.txt`
  const payload = 'comprobación de escritura'

  try {
    const stored = await putFile(key, new Blob([payload], { type: 'text/plain' }), {
      allowOverwrite: true,
    })

    const { getFile } = await import('@/lib/storage')
    const read = await getFile(key)

    if (read.body.toString('utf8') !== payload) {
      record('Almacenamiento', 'fail', `driver "${storageDriver}": lo leído no coincide con lo escrito`)
      return
    }

    await deleteFile(stored.url)
    record('Almacenamiento', 'ok', `driver "${storageDriver}": escritura, lectura y borrado correctos`)
  } catch (error) {
    record(
      'Almacenamiento',
      'fail',
      `driver "${storageDriver}": ${message(error)}`,
      storageDriver === 's3'
        ? 'Revisa S3_ENDPOINT, S3_BUCKET, las credenciales y que el bucket exista'
        : 'Revisa que STORAGE_PATH exista y tenga permisos de escritura'
    )
  }
}

async function main() {
  console.log('Diagnóstico del entorno\n')

  await checkDatabase()
  await checkEmbeddings()
  await checkChatModel()
  await checkContextWindow()
  await checkStorage()

  const failed = results.filter((result) => result.status === 'fail')
  const warned = results.filter((result) => result.status === 'warn')

  console.log('')
  if (failed.length > 0) {
    console.log(`${failed.length} comprobación(es) fallida(s). El sistema no está listo.`)
    process.exitCode = 1
    return
  }

  if (warned.length > 0) {
    console.log(`Todo funciona, con ${warned.length} aviso(s) que conviene revisar.`)
    return
  }

  console.log('Todo correcto.')
}

main()
  .catch((error) => {
    console.error('El diagnóstico falló inesperadamente:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
