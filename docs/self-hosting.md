# Autohospedaje

## Requisitos

- PostgreSQL >= 14 con la extensión [pgvector](https://github.com/pgvector/pgvector).
- Un servidor de modelos con API compatible con OpenAI (Ollama, vLLM, LM Studio,
  llama.cpp) o una clave de un proveedor externo.
- Disco para los documentos subidos (`STORAGE_PATH`).

## Instalación con Docker

```bash
cp .env.example .env
docker compose up -d
docker compose exec ollama ollama pull qwen2.5:14b-instruct
docker compose exec ollama ollama pull bge-m3
```

El contenedor de la aplicación ejecuta `prisma migrate deploy` al arrancar, así
que la base de datos queda lista sola.

## Instalación manual

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run build
bun run start
```

Con `STORAGE_DRIVER=local`, el proceso necesita permiso de escritura sobre
`STORAGE_PATH`. Los archivos se sirven por `/api/files/...`, que exige sesión y
—para documentos— pertenencia a la organización dueña del documento.

## Elección de modelos

### Chat

Con modelos locales la calidad de respuesta depende mucho del tamaño. Un 7–8B da
respuestas pobres para uso empresarial; a partir de 14B cuantizado el resultado
es utilizable y con 24–32B es bueno. En español funcionan bien `qwen2.5`,
`llama3.3` y `mistral-small`.

### Embeddings

La recuperación es tan buena como el modelo de embeddings. Para contenido en
español conviene un modelo multilingüe:

| Modelo | Dimensiones | Notas |
|---|---|---|
| `bge-m3` | 1024 | Multilingüe, buena opción por defecto |
| `multilingual-e5-large` | 1024 | Alternativa sólida en español |
| `nomic-embed-text` | 768 | Ligero, calidad menor en español |
| `text-embedding-3-small` (OpenAI) | 1536 | Referencia de calidad, no autohospedado |

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
2. El directorio `STORAGE_PATH`, con los archivos originales.
