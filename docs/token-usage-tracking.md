# Sistema de Tracking de Tokens y Costos - Implementado ✅

## Resumen

Sistema completo de tracking de tokens y costos de OpenAI implementado con límites configurables por organización, dashboards de visualización y bloqueo automático cuando se alcanzan los límites.

## Características Implementadas

### 1. Base de Datos ✅

**Nuevos Modelos en Prisma:**

- **TokenUsage**: Registro histórico de cada consumo de tokens
  - Almacena tokens de input, output, total
  - Costo en USD por operación
  - Tipo de operación (embedding/chat)
  - Organización y usuario que generó el consumo
  - Timestamp para análisis temporal

- **OrganizationLimits**: Límites configurables por organización
  - Límites diarios y mensuales de tokens
  - Límites diarios y mensuales de requests
  - Sistema de bloqueo con razón y timestamp
  - Tracking de quién actualizó los límites

### 2. Utilidades de Cálculo ✅

**lib/ai/token-calculator.ts:**
- Cálculo local de tokens usando tiktoken (encoding cl100k_base)
- Cálculo de costos basado en pricing oficial de OpenAI
- Soporte para gpt-4o-mini y text-embedding-3-small
- Funciones de formateo para USD y tokens

**lib/ai/token-tracker.ts:**
- Tracking de uso en base de datos
- Obtención de uso por organización (diario/mensual)
- Desglose de uso por usuario dentro de una organización
- Estadísticas globales del sistema

**lib/ai/limit-validator.ts:**
- Validación de límites antes de operaciones
- Creación automática de límites default si no existen
- Bloqueo automático al alcanzar límites
- Manejo de errores gracefully (permite operación en caso de error)

### 3. Integración en Endpoints ✅

**app/api/chat/route.ts:**
- Validación de límites ANTES de procesar el chat
- Retorna error 429 si se alcanzó el límite con información detallada
- Tracking de tokens reales después del procesamiento
- Usa tokens del objeto usage de OpenAI cuando está disponible

**app/api/knowledge/process/[id]/route.ts:**
- Validación de límites ANTES de generar embeddings
- Tracking de tokens usados en embeddings
- Actualiza documento con error si se alcanza el límite

### 4. API Endpoints de Admin ✅

**GET /api/admin/token-usage/stats:**
- Estadísticas globales (diario/mensual)
- Top 5 organizaciones por consumo
- Tendencias de los últimos 7 días

**GET /api/admin/token-usage/organizations:**
- Lista de organizaciones con consumo
- Query params: period (day/month), sortBy (tokens/cost)
- % de uso del límite para cada organización
- Indicador de organizaciones cerca del límite (>80%)

**GET /api/admin/token-usage/organizations/[id]:**
- Detalle completo de una organización
- Desglose por usuario
- Historial temporal (últimos 30 días)
- Uso por tipo de operación (chat/embedding)

**GET/PUT /api/admin/organizations/[id]/limits:**
- Obtener límites actuales de una organización
- Actualizar límites (solo super admin)
- Bloquear/desbloquear organización

### 5. Componentes de UI ✅

**Token Usage Summary Card:**
- Card en dashboard principal de admin
- Muestra costo total, tokens, y tendencia
- Link a vista detallada

**Usage Stats Cards:**
- Cards con métricas principales
- Costo total, tokens, requests, orgs activas
- Vista diaria o mensual

**Organizations Usage Table:**
- Tabla completa con todas las organizaciones
- Expandible para ver detalles
- Indicadores visuales de estado (bloqueada, cerca del límite, activa)
- Botones para editar límites y ver detalles

**Limits Dialog:**
- Dialog para editar límites de una organización
- Formulario completo con validación
- Opción para bloquear/desbloquear con razón

**Usage Chart:**
- Gráfico de líneas con recharts
- Muestra tokens y costo temporal
- Responsive y configurable

### 6. Páginas ✅

**app/admin/page.tsx - ACTUALIZADA:**
- Agregada TokenUsageSummaryCard en el grid de métricas

**app/admin/token-usage/page.tsx - NUEVA:**
- Vista completa con tabs
- Tab Overview: estadísticas, gráficos, top organizaciones
- Tab Organizations: tabla completa con gestión
- Filtros de período (día/mes)

**app/admin/token-usage/organizations/[id]/page.tsx - NUEVA:**
- Vista detallada de una organización
- Desglose por usuario
- Historial de 30 días
- Uso por operación
- Gestión de límites

**Sidebar de Admin - ACTUALIZADO:**
- Agregado item "Uso de Tokens" con icono DollarSign

### 7. Testing ✅

**tests/token-calculator.test.ts:**
- 18 tests que validan cálculo de tokens
- Tests de cálculo de costos
- Tests de formateo
- Validación de constantes de pricing
- ✅ Todos los tests pasan

**tests/limit-validator.test.ts:**
- 6 tests que validan lógica de límites
- Creación de límites default
- Bloqueo automático
- Manejo de errores
- ✅ Todos los tests pasan

## Flujo de Funcionamiento

### Cuando un Usuario Hace una Consulta (Chat):

1. **Validación Pre-Operación:**
   - Se calcula estimación de tokens con tiktoken
   - Se verifica contra límites de la organización
   - Si excede: retorna 429 con detalles del uso actual

2. **Procesamiento:**
   - Se procesa el chat normalmente
   - Se obtiene respuesta de OpenAI

3. **Tracking Post-Operación:**
   - Se registran tokens reales del objeto usage
   - Se calcula costo basado en pricing
   - Se guarda en TokenUsage

### Cuando se Procesa un Documento:

1. **Validación Pre-Operación:**
   - Se estiman tokens basado en longitud de chunks
   - Se verifican límites
   - Si excede: documento marcado como error

2. **Procesamiento:**
   - Se generan embeddings

3. **Tracking Post-Operación:**
   - Se calculan tokens reales
   - Se registra uso en TokenUsage

### Bloqueo Automático:

Cuando una organización alcanza cualquier límite:
- Se actualiza `isBlocked = true` en OrganizationLimits
- Se guarda la razón del bloqueo
- Se guarda timestamp del bloqueo
- Próximas requests retornan 429 inmediatamente

### Gestión de Límites (Super Admin):

- Solo super admins pueden modificar límites
- Pueden aumentar límites para desbloquear organizaciones
- Pueden bloquear manualmente con razón customizada
- Se registra quién hizo el cambio (updatedBy)

## Límites por Defecto

```typescript
{
  dailyTokenLimit: 1_000_000,      // 1M tokens por día
  monthlyTokenLimit: 5_000_000,    // 5M tokens por mes
  dailyRequestLimit: 10_000,       // 10K requests por día
  monthlyRequestLimit: 100_000,    // 100K requests por mes
}
```

## Pricing Actual (OpenAI)

```typescript
{
  'gpt-4o-mini': {
    input: $0.15 / 1M tokens,
    output: $0.60 / 1M tokens
  },
  'text-embedding-3-small': {
    input: $0.02 / 1M tokens,
    output: $0 (no hay output en embeddings)
  }
}
```

## Tecnologías Usadas

- **tiktoken**: Cálculo local de tokens (preciso y rápido)
- **Prisma**: ORM para gestión de base de datos
- **TanStack Query**: Manejo de estado del servidor
- **Recharts**: Visualización de datos
- **Vitest**: Testing unitario

## Archivos Creados/Modificados

### Nuevos Archivos (19):
- `lib/ai/token-calculator.ts`
- `lib/ai/token-tracker.ts`
- `lib/ai/limit-validator.ts`
- `app/api/admin/token-usage/stats/route.ts`
- `app/api/admin/token-usage/organizations/route.ts`
- `app/api/admin/token-usage/organizations/[id]/route.ts`
- `app/api/admin/organizations/[id]/limits/route.ts`
- `components/admin/token-usage-summary-card.tsx`
- `components/admin/token-usage/usage-stats-cards.tsx`
- `components/admin/token-usage/organizations-usage-table.tsx`
- `components/admin/token-usage/usage-chart.tsx`
- `components/admin/token-usage/limits-dialog.tsx`
- `app/admin/token-usage/page.tsx`
- `app/admin/token-usage/organizations/[id]/page.tsx`
- `tests/token-calculator.test.ts`
- `tests/limit-validator.test.ts`
- `prisma/migrations/20251029012646_add_token_usage_tracking/`

### Archivos Modificados (6):
- `prisma/schema.prisma` - Agregados modelos TokenUsage y OrganizationLimits
- `app/api/chat/route.ts` - Integrado tracking y validación
- `app/api/knowledge/process/[id]/route.ts` - Integrado tracking y validación
- `app/admin/page.tsx` - Agregada summary card
- `components/admin-sidebar.tsx` - Agregado item de menu
- `package.json` / `bun.lock` - Agregadas dependencias (tiktoken, recharts)

## Próximos Pasos Sugeridos

1. **Alertas Proactivas:**
   - Email al owner cuando organización alcanza 80% del límite
   - Notificaciones en la UI para owners

2. **Análisis Predictivo:**
   - Predicción de cuando se alcanzará el límite basado en tendencia
   - Sugerencias de límites óptimos

3. **Exportación de Reportes:**
   - CSV/Excel de uso por organización
   - Reportes mensuales automáticos

4. **Billing/Facturación:**
   - Sistema de facturación basado en uso
   - Planes con diferentes límites

5. **Optimización:**
   - Cache de queries frecuentes
   - Agregación pre-calculada para métricas
   - Índices adicionales en base de datos

## Notas Técnicas

- Todos los cálculos de tokens son locales (tiktoken) para rapidez
- Se guarda el uso real de OpenAI después de cada operación
- Reset de contadores es "on-demand" (se calcula en cada validación)
- Sistema es resiliente: si falla el tracking, no falla la operación
- Tests cubren los casos críticos de cálculo y validación

