# Contribuir a Guía

Gracias por el interés. Este documento cubre lo mínimo para empezar.

## Entorno

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

Antes de abrir un pull request:

```bash
bun run test        # unitarios
bun run lint
bun run build
```

## Qué es bienvenido

- Correcciones de errores con un caso reproducible.
- Soporte para nuevos formatos de documento o proveedores de modelos.
- Traducciones y mejoras de accesibilidad.
- Documentación de despliegue en escenarios reales.

Para cambios grandes, abre antes una issue describiendo el enfoque. Es más
rápido discutir el diseño que revisar un PR de mil líneas que va en otra
dirección.

## Licencia de las contribuciones

El proyecto se distribuye bajo AGPL-3.0 y además se ofrece bajo licencia
comercial a quien no pueda cumplir la AGPL. Para que ese doble modelo sea
posible, al enviar una contribución declaras que:

1. El trabajo es tuyo o tienes derecho a aportarlo.
2. Concedes al mantenedor del proyecto una licencia perpetua, mundial, no
   exclusiva, gratuita e irrevocable para usar, reproducir, modificar,
   sublicenciar y distribuir tu contribución, **incluida su distribución bajo
   términos de licencia distintos de la AGPL-3.0**.
3. Conservas el copyright de tu contribución.

Si no estás de acuerdo con el punto 2, coméntalo en la issue: puede haber otras
formas de incorporar el trabajo (por ejemplo, como módulo externo).

## Estilo

No hay una guía extensa: imita el código que ya está alrededor. El proyecto usa
TypeScript estricto, componentes de servidor por defecto y Tailwind con
Shadcn/UI.
