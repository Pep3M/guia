# Demostración pública

La demo es una organización sembrada con datos ficticios de una empresa de
logística inventada, **Nordika Logística**. Sirve para que alguien pruebe el
producto en un minuto sin registrarse ni instalar nada.

## Qué demuestra

Lo que diferencia a Guía no es responder preguntas sobre documentos: es que la
respuesta depende de a qué tiene acceso quien pregunta. La demo se sembró para
que eso se vea de inmediato.

Hay tres categorías —General, Recursos Humanos y Confidencial— y dos cuentas:

| Cuenta | Rol | Ve |
|---|---|---|
| `demo@nordika.example` | Dirección (OWNER) | Las tres categorías |
| `almacen@nordika.example` | Almacén (MEMBER) | Sólo General y RRHH |

La contraseña de ambas es la de `NEXT_PUBLIC_DEMO_PASSWORD`.

Preguntas que lo enseñan bien:

- *«¿Cuántos días de vacaciones tengo?»* → responden las dos cuentas.
- *«¿Cuál es el margen mínimo en transporte nacional?»* → responde dirección;
  la cuenta de almacén no encuentra nada, porque el filtro se aplica en la
  búsqueda vectorial, no ocultando resultados en pantalla.

## Activarla

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEMO_EMAIL="demo@nordika.example"
NEXT_PUBLIC_DEMO_PASSWORD="una-contraseña-publica"
NEXT_PUBLIC_DEMO_ORG_SLUG="nordika"
```

```bash
bun run demo:seed
```

El botón «Probar la demo» aparece entonces en la portada. Detrás no hay ninguna
vía de autenticación especial: hace un login normal con esas credenciales, que
son públicas a propósito. Si `NEXT_PUBLIC_DEMO_MODE` no es `true`, el botón no
se renderiza y no queda ningún camino abierto.

## Reiniciarla

`bun run demo:seed` es idempotente y destructivo **sólo** con la organización
demo: la borra entera y la reconstruye. Lo que un visitante haya subido o
preguntado desaparece; el resto de la base no se toca.

En una instancia pública conviene ejecutarlo por cron cada pocas horas:

```cron
0 */6 * * * cd /ruta/a/guia && bun run demo:seed >> /var/log/guia-demo.log 2>&1
```

## Antes de exponerla a internet

La demo es una cuenta real con permisos reales sobre una organización real. Dos
cosas que conviene poner en su sitio:

1. **Cuota de tokens.** Crea un registro de `OrganizationLimits` para la
   organización demo con un tope diario. Sin él, un visitante con tiempo libre
   puede gastar tu presupuesto de inferencia o saturar la GPU.
2. **Tamaño de subida.** `MAX_UPLOAD_SIZE_MB` bajo (5–10 MB) si dejas que los
   visitantes suban sus propios documentos.

## Cambiar el contenido

Los documentos están en `demo/documents/`, un subdirectorio por categoría. Para
sembrar otros, sustituye los `.md` y ajusta la lista `CATEGORIES` en
`scripts/seed-demo.ts`. La categoría marcada como `restricted: true` es la que
queda fuera del alcance del grupo de la cuenta MEMBER.
