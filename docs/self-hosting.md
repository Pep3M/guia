# Autohospedaje

## Requisitos

- PostgreSQL >= 14 con la extensión [pgvector](https://github.com/pgvector/pgvector).
- Un servidor de modelos con API compatible con OpenAI (Ollama, vLLM, LM Studio,
  llama.cpp) o una clave de un proveedor externo.
- Disco para los documentos subidos (`STORAGE_PATH`).

## Instalación con Docker

```bash
cp .env.example .env
# genera las contraseñas: la de la base de datos y el secreto de sesión
sed -i.bak "s|cambia-esta-clave|$(openssl rand -hex 16)|g; s|cambia-esto-por-un-secreto-largo|$(openssl rand -base64 32)|" .env && rm .env.bak
docker compose up -d
```

El servicio `ollama-init` descarga los modelos y crea la variante de chat con la
ventana de contexto ampliada; la primera vez tarda, son varios GB. El contenedor
de la aplicación ejecuta `prisma migrate deploy` al arrancar, así que la base de
datos queda lista sola.

Con GPU NVIDIA (requiere `nvidia-container-toolkit`):

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

## Comprobar que todo funciona

```bash
docker compose --profile tools run --rm tools bun run doctor
```

Verifica contra los servicios reales las cuatro cosas que rompen una
instalación: base de datos con pgvector, modelo de chat, modelo de embeddings
con su dimensión, y escritura/lectura en el almacenamiento. Además detecta si el
modelo está truncando el contexto, que es el fallo más silencioso de todos.

Ejecútalo siempre antes de dar una instalación por buena.

## Instalación manual

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run build
bun run start
```

## Almacenamiento de archivos

| Driver | Cuándo |
|---|---|
| `local` | Una sola máquina. Cero servicios extra. Por defecto |
| `s3` | Varias réplicas de la aplicación, replicación o backups con herramientas de S3 |
| `vercel-blob` | Sólo desplegando en Vercel |

Con `local`, el proceso necesita permiso de escritura sobre `STORAGE_PATH`.

Con `s3` sirve cualquier implementación compatible: MinIO, Ceph, Garage,
Cloudflare R2, Backblaze B2 o el propio AWS S3. El compose trae MinIO listo:

```bash
STORAGE_DRIVER=s3 docker compose --profile minio up -d
```

`S3_FORCE_PATH_STYLE` debe estar en `true` para MinIO, Ceph y Garage, y en
`false` para R2, B2 y AWS.

En los dos primeros drivers los archivos se sirven por `/api/files/...`, que
exige sesión y —para documentos— pertenencia a la organización dueña. Con
`vercel-blob` la URL es pública y ajena a nosotros: cualquiera que la conozca
accede al documento, y por eso no es el driver recomendado para material
interno.

## Elección de modelos

### Chat

Con modelos locales la calidad de respuesta depende mucho del tamaño. Un 7–8B da
respuestas pobres para uso empresarial; a partir de 14B cuantizado el resultado
es utilizable y con 24–32B es bueno. En español funcionan bien `qwen2.5`,
`llama3.3` y `mistral-small`.

#### La ventana de contexto: el fallo silencioso

Ollama usa `num_ctx = 4096` por defecto y **descarta sin avisar** lo que no cabe.
Con RAG eso es grave: el prompt de sistema, los fragmentos recuperados y el
historial de conversación superan ese límite enseguida, y el resultado son
respuestas pobres sin ningún error en los registros. Parece que el modelo es
malo cuando en realidad no está viendo los documentos.

Por eso el stack no usa el modelo base directamente, sino una variante creada
desde `docker/ollama/Modelfile.chat` con `num_ctx 8192`. Si instalas a mano:

```bash
ollama pull qwen2.5:14b-instruct
ollama create guia-chat -f docker/ollama/Modelfile.chat
```

Ampliar el contexto cuesta VRAM. Si vas justo de memoria, la alternativa es
reducir cuánto contexto se inyecta bajando `RAG_MAX_CHUNKS` (cada fragmento son
unos 200 tokens). `bun run doctor` avisa si el modelo está truncando.

### Embeddings

La recuperación es tan buena como el modelo de embeddings. Para contenido en
español conviene un modelo multilingüe:

| Modelo | Dimensiones | Notas |
|---|---|---|
| `bge-m3` | 1024 | Multilingüe, buena opción por defecto |
| `multilingual-e5-large` | 1024 | Alternativa sólida en español |
| `nomic-embed-text` | 768 | Ligero, calidad menor en español |
| `text-embedding-3-small` (OpenAI) | 1536 | Referencia de calidad, no autohospedado |

Los fragmentos se envían por lotes de `EMBEDDING_BATCH_SIZE` (32 por defecto).
Algunos servidores locales no aceptan `input` como array en `/v1/embeddings` o
limitan el tamaño de la petición; en ese caso, `EMBEDDING_BATCH_SIZE=1`.

## Cambiar el modelo de embeddings

La columna `Chunk.embedding` declara una dimensión fija. Si el modelo nuevo tiene
otra dimensión hay que migrar la columna **y reindexar**: los vectores viejos no
son comparables con los nuevos aunque coincidieran las dimensiones.

1. Ajusta `EMBEDDING_MODEL` y `EMBEDDING_DIMENSIONS` en `.env`.
2. Cambia la dimensión en `prisma/schema.prisma`:

   ```prisma
   embedding Unsupported("vector(1024)")?
   ```

3. Crea la migración:

   ```bash
   bun run db:migrate --name change_embedding_dimensions
   ```

   La migración debe vaciar los chunks existentes, porque no se pueden convertir:

   ```sql
   DELETE FROM "Chunk";
   ALTER TABLE "Chunk" ALTER COLUMN "embedding" TYPE vector(1024);
   ```

4. Vuelve a procesar los documentos desde la interfaz de cada organización.

La aplicación comprueba en cada llamada que el vector devuelto tiene la dimensión
esperada y falla con un mensaje explícito si no coincide, en lugar de dejar que
Postgres rechace el INSERT con un error opaco.

## Cuotas de uso

`OrganizationLimits` y `UserTokenLimits` permiten topes de tokens y peticiones por
organización y por usuario. **Son opcionales**: sin registro, no hay límite. Se
gestionan desde `Administración → Uso de tokens` dentro de cada organización.

Al superar un tope se rechaza la petición concreta; no se bloquea la organización
de forma persistente. El bloqueo permanente existe (`OrganizationLimits.isBlocked`)
pero sólo si un administrador lo activa.

## Copias de seguridad

Dos cosas que respaldar:

1. La base de datos (`pg_dump`), que contiene documentos indexados, conversaciones
   y permisos.
2. Los archivos originales: el directorio `STORAGE_PATH` con el driver `local`,
   o el bucket con el driver `s3` (`mc mirror`, `rclone` o la replicación del
   propio MinIO).

Los modelos no hace falta respaldarlos: se vuelven a descargar.
