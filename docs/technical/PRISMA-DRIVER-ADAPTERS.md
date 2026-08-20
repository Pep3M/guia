# Prisma Driver Adapters para Edge Runtime

## Problema

El middleware de Next.js se ejecuta en el **Edge Runtime**, que es un entorno ligero sin acceso al motor de Rust que Prisma tradicionalmente requiere. Esto causaba errores al intentar usar autenticación en el middleware.

## Solución

Implementamos **Prisma Driver Adapters** que permiten a Prisma funcionar en Edge Runtime usando drivers nativos de JavaScript.

## Implementación

### 1. Dependencias Instaladas

```bash
bun add @prisma/adapter-pg pg @types/pg
```

- **`@prisma/adapter-pg`**: Adaptador de Prisma para el driver `pg`
- **`pg`**: Driver PostgreSQL nativo de JavaScript
- **`@types/pg`**: Tipos TypeScript para `pg`

### 2. Estructura de Archivos

#### `lib/prisma.ts` (Para Node.js Runtime)

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Uso**: Rutas API normales que corren en Node.js runtime.

#### `lib/prisma-edge.ts` (Para Edge Runtime)

```typescript
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prismaEdge: PrismaClient | undefined
  pgPool: Pool | undefined
}

if (!globalForPrisma.pgPool) {
  globalForPrisma.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
}

if (!globalForPrisma.prismaEdge) {
  const adapter = new PrismaPg(globalForPrisma.pgPool)
  globalForPrisma.prismaEdge = new PrismaClient({ adapter })
}

export const prismaEdge = globalForPrisma.prismaEdge
export const pgPool = globalForPrisma.pgPool
```

**Uso**: Better Auth y middleware que corren en Edge runtime.

### 3. Configuración de Better Auth

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prismaEdge } from "@/lib/prisma-edge" // ← Usa prismaEdge

export const auth = betterAuth({
  database: prismaAdapter(prismaEdge, {
    provider: "postgresql",
  }),
  // ... resto de la configuración
})
```

### 4. Schema de Prisma

El schema NO necesita preview features adicionales en la versión 6.17.1+:

```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}
```

## Cuándo Usar Cada Instancia

### Usa `prisma` (de `lib/prisma.ts`)

- ✅ API Routes normales (`app/api/**/route.ts`)
- ✅ Server Components
- ✅ Server Actions
- ✅ Scripts de backend
- ✅ Procesamiento de datos

**Ejemplo:**
```typescript
// app/api/organizations/route.ts
import { prisma } from "@/lib/prisma"

export async function GET() {
  const orgs = await prisma.organization.findMany()
  return Response.json(orgs)
}
```

### Usa `prismaEdge` (de `lib/prisma-edge.ts`)

- ✅ Middleware (`middleware.ts`)
- ✅ Edge API Routes (con `export const runtime = 'edge'`)
- ✅ Better Auth (para que funcione en middleware)

**Ejemplo:**
```typescript
// lib/auth.ts
import { prismaEdge } from "@/lib/prisma-edge"
```

## Ventajas

1. **Edge Runtime Compatible**: El middleware puede validar autenticación sin problemas
2. **Mejor Rendimiento**: Edge runtime es más rápido para validaciones simples
3. **Conexiones Eficientes**: Connection pooling con `pg`
4. **Sin Cambios en el Schema**: El schema de Prisma permanece igual
5. **Retrocompatible**: El código existente sigue funcionando

## Consideraciones

### Performance

- El driver adapter `pg` usa TCP, igual que Prisma tradicional
- Para máximo rendimiento en Edge, considera drivers serverless como:
  - **Neon** (`@prisma/adapter-neon`)
  - **PlanetScale** (`@prisma/adapter-planetscale`)

### Connection Pooling

El `Pool` de `pg` maneja automáticamente las conexiones. En producción con Edge:

- El pool se reutiliza entre invocaciones
- Considera límites de conexión de tu base de datos
- Para serverless, usa connection pooling como PgBouncer o Neon

### Variables de Entorno

Ambas instancias usan la misma `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/guia_db"
```

## Testing

Para verificar que funciona correctamente:

1. **Inicia el servidor:**
   ```bash
   bun run dev
   ```

2. **Prueba autenticación:**
   - Accede a `/organizations` sin login → debe redirigir
   - Login con credenciales válidas → debe funcionar
   - El middleware debe validar la sesión sin errores

3. **Verifica rutas API:**
   - Las rutas API existentes deben seguir funcionando
   - No hay cambios necesarios en el código de las APIs

## Troubleshooting

### Error: "pg module not found"

**Solución:**
```bash
bun add pg @types/pg
```

### Error: "PrismaPg is not a constructor"

**Solución:**
```bash
bun run db:generate
```

### Error en el middleware

Verifica que `lib/auth.ts` use `prismaEdge` y no `prisma`.

### Queries muy lentas en Edge

Considera migrar a un driver serverless optimizado para Edge:
- Neon para PostgreSQL
- Turso para SQLite

## Referencias

- [Prisma Driver Adapters Documentation](https://pris.ly/d/driver-adapters)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)
- [Better Auth with Prisma](https://www.better-auth.com/docs/adapters/prisma)
- [pg Driver Documentation](https://node-postgres.com/)

## Changelog

- **2025-10-14**: Implementación inicial de driver adapters para resolver problemas de Edge runtime en middleware


