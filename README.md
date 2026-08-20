# Guía

Base de conocimiento con IA **compartimentada** y **autohospedable**, pensada para
empresas que necesitan que sus procedimientos y secretos comerciales no salgan de
su propia infraestructura.

Sube documentos, organízalos por categorías, decide qué grupo de personas ve qué,
y deja que tu equipo pregunte en lenguaje natural. Las respuestas se construyen
únicamente con los documentos a los que quien pregunta tiene acceso.

## Qué lo diferencia

- **Permisos reales sobre el conocimiento.** Categorías, grupos y acceso por
  grupo a categorías. El filtrado ocurre en la propia búsqueda vectorial, no
  ocultando resultados en la interfaz.
- **Multi-organización.** Una instalación puede servir a varios departamentos o
  empresas, cada uno con sus documentos y sus miembros.
- **Sin dependencia de terceros.** Modelos, embeddings, base de datos y archivos
  pueden vivir enteros en tu servidor: Ollama o vLLM para la inferencia,
  PostgreSQL con pgvector para los vectores, y disco local o MinIO para los
  documentos.
- **Integraciones.** Slack, para preguntar desde donde ya trabaja el equipo.

## Stack

Next.js 16 · PostgreSQL + pgvector · Prisma · Better Auth · Vercel AI SDK ·
Shadcn/UI + Tailwind · Vitest

## Arranque rápido (Docker)

```bash
git clone https://github.com/Pep3M/guia.git
cd guia
cp .env.example .env
# genera las contraseñas: la de la base de datos y el secreto de sesión
sed -i.bak "s|cambia-esta-clave|$(openssl rand -hex 16)|g; s|cambia-esto-por-un-secreto-largo|$(openssl rand -base64 32)|" .env && rm .env.bak
docker compose up -d
```

Eso levanta PostgreSQL con pgvector, Ollama con los modelos y la aplicación en
http://localhost:3000. Las migraciones y la descarga de modelos se hacen solas;
la primera vez tarda, porque son varios GB.

Cuando termine, comprueba la instalación:

```bash
docker compose --profile tools run --rm tools bun run doctor
```

Verifica contra los servicios reales la base de datos, ambos modelos y el
almacenamiento, y avisa de los problemas que no dan error visible —como que el
modelo esté truncando el contexto.

## Probar sin instalar nada

El repositorio incluye una organización de ejemplo con documentos ficticios de
una empresa de logística y dos cuentas con distinto nivel de acceso, para ver en
un minuto cómo la misma pregunta obtiene respuesta o no según quién la haga:

```bash
NEXT_PUBLIC_DEMO_MODE=true bun run demo:seed
```

Detalles en [docs/demo.md](./docs/demo.md).

## Desarrollo

Requisitos: Bun >= 1.2 y PostgreSQL >= 14 con pgvector.

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `bun run dev` | Servidor de desarrollo |
| `bun run build` | Build de producción |
| `bun run test` | Tests unitarios (Vitest, modo watch) |
| `bun run test:integration` | Tests de integración |
| `bun run db:migrate` | Aplica migraciones en desarrollo |
| `bun run db:studio` | Explorador de la base de datos |
| `bun run doctor` | Diagnostica modelos, base de datos y almacenamiento |
| `bun run demo:seed` | Siembra la organización de demostración |

## Modelos

Todo se configura contra una API compatible con OpenAI, que es lo que exponen
Ollama, vLLM, LM Studio, llama.cpp y la propia OpenAI. Cambiar de proveedor es
cambiar `AI_BASE_URL`, no tocar código.

```env
AI_BASE_URL="http://localhost:11434/v1"
CHAT_MODEL="qwen2.5:14b-instruct"
EMBEDDING_MODEL="bge-m3"
EMBEDDING_DIMENSIONS=1024
```

**El modelo de embeddings no se cambia a la ligera:** su dimensión debe coincidir
con la de la columna `Chunk.embedding` y cambiarla obliga a reindexar todos los
documentos. Ver [docs/self-hosting.md](./docs/self-hosting.md).

## Hardware recomendado

Para que las respuestas con modelos locales sean útiles, no basta un modelo
pequeño. Punto de partida razonable para 10–50 usuarios:

| Componente | Mínimo | Recomendado |
|---|---|---|
| GPU | 16 GB VRAM (modelo 14B cuantizado) | 24–48 GB VRAM (modelo 24–32B) |
| RAM | 32 GB | 64 GB |
| Disco | 100 GB SSD | 500 GB NVMe |

Sin GPU la aplicación funciona, pero la latencia de respuesta la hace incómoda
para uso diario. Alternativa: apuntar `AI_BASE_URL` a un proveedor externo y
mantener sólo los datos en local.

## Licencia

[AGPL-3.0](./LICENSE). Puedes usarlo, modificarlo y desplegarlo libremente; si lo
ofreces como servicio a terceros, las modificaciones deben publicarse bajo la
misma licencia.

¿Necesitas una licencia comercial sin las obligaciones de la AGPL, o soporte e
instalación? Escribe a través de [las issues del repositorio](https://github.com/Pep3M/guia/issues).
