# Integración con Slack

Esta guía describe cómo habilitar un bot de Slack para que los miembros de una organización consulten el conocimiento disponible en GUÍA sin salir de sus canales de trabajo.

## Requisitos previos

- Ser OWNER o ADMIN de la organización en GUÍA.
- Contar con un workspace de Slack con permisos para crear e instalar aplicaciones.
- Haber cargado documentos y categorías en GUÍA que delimiten el contexto del bot.
- Variables de entorno configuradas:
  - `NEXT_PUBLIC_APP_URL` o `APP_URL` apuntando al dominio público de GUÍA.
  - `OPENAI_API_KEY` y `DATABASE_URL` ya presentes en la instalación base.

## Flujo general

1. Crear la integración desde `Integraciones > Slack` dentro del espacio de la organización.
2. Generar el manifest y crear la app correspondiente en Slack.
3. Instalar la app en el workspace y copiar las credenciales proporcionadas por Slack.
4. Registrar las credenciales en GUÍA.
5. Asociar categorías de conocimiento al bot.
6. Validar el funcionamiento en un canal de prueba y revisar los registros de interacción.

## Paso a paso

### 1. Crear la integración en GUÍA

1. Navega a `/<slug>/settings/integrations/slack`.
2. Haz clic en **Nueva integración**.
3. Define:
   - **Nombre del bot** (ej. “Asistente Comercial”).
   - **Descripción** (opcional, se muestra en el panel).
   - Categorías iniciales (opcional, se puede ajustar luego).
4. Confirma la creación. GUÍA generará un slug único y dejará la integración en estado activo sin credenciales.

### 2. Generar el manifest

1. Después de crear la integración, GUÍA mostrará el manifest JSON.
2. Copia el manifest (botón **Copiar manifest**) o descárgalo a un archivo.
3. Entra a [api.slack.com/apps](https://api.slack.com/apps) y elige **Create New App → From manifest**.
4. Pega el JSON provisto y valida los scopes:
   - `app_mentions:read`
  - `chat:write`
   - `chat:write.public`
   - `files:write`
   - `commands`
5. Confirma la creación de la app.

> El manifest generado incluye el endpoint de eventos `https://<tu-dominio>/api/integrations/slack/events`. Si cambias el dominio, regenera el manifest.

### 3. Instalar la aplicación en Slack

1. Dentro del panel de la app ve a **Install App** y autoriza la instalación en el workspace.
2. Registra los siguientes valores:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**
   - **Bot User OAuth Token (xoxb-...)**
   - **Bot User ID** (opcional; aparece en la sección *OAuth & Permissions* una vez instalado).

### 4. Guardar credenciales en GUÍA

1. Vuelve a la integración recién creada desde GUÍA.
2. En la sección **Credenciales** introduce los valores copiados.
3. Decide si las respuestas del bot deben ir en el hilo original (interruptor “Responder en hilo por defecto”).
4. Guarda los cambios. GUÍA encriptará los secretos y los asociará al bot.

### 5. Asociar categorías de conocimiento

1. En la sección **Categorías** marca aquellas que quieras habilitar.
2. Guarda la selección. El bot sólo utilizará las fuentes conectadas a esas categorías.
3. Puedes cambiar la selección en cualquier momento desde el mismo panel.

### 6. Validar funcionamiento

1. Invita al bot al canal de Slack donde quieras probarlo (`/invite @nombre-bot`).
2. Menciónalo con una consulta, por ejemplo `@nombre-bot ¿Cuál es nuestra política de vacaciones?`.
3. El bot responderá primero con un mensaje tipo “Espera, déjame pensar…” y luego con la respuesta final.
4. Si hay un problema:
   - Verifica que el Signing Secret y el bot token sean correctos.
   - Confirma que el endpoint de eventos responda 200 (los errores aparecerán en los registros).
   - Revisa el log de interacciones en GUÍA para ver la transcripción, los errores y datos de desempeño.

## Endpoint de eventos

La ruta `POST /api/integrations/slack/events` valida la firma de Slack, maneja:

- `url_verification` → responde con el `challenge`.
- `event_callback` con tipo `app_mention` → envía un mensaje de “pensando”, genera la respuesta con el conocimiento disponible y actualiza el mensaje en Slack.

Si se exceden los límites de consumo de la organización, el bot informa que el cupo está agotado y registra el incidente.

## Registros y monitoreo

- GUÍA almacena en `SlackIntegrationLog` cada interacción con:
  - Usuario y canal de Slack.
  - Pregunta realizada.
  - Respuesta entregada o error.
  - Tokens consumidos y tiempo de respuesta.
- Los registros pueden consultarse filtrando por fechas, usuario o canal desde el tablero de integraciones.

## Buenas prácticas

- Rotar las credenciales periódicamente en Slack y actualizarlas en GUÍA.
- Limitar el bot a canales donde la información sea pertinente.
- Revisar los registros para detectar preguntas recurrentes o errores de contexto.
- Mantener la categorización del conocimiento al día para respuestas más precisas.

## Troubleshooting rápido

| Síntoma | Posibles causas | Acción sugerida |
| --- | --- | --- |
| Slack reintenta el evento (cabecera `X-Slack-Retry-Num`) | El endpoint tardó más de 3 segundos | Confirmar que la función responde 200 inmediatamente (la lógica pesada corre en segundo plano). |
| Mensaje “La organización alcanzó el límite de uso” | Se superaron los límites diarios/mensuales | Aumentar límites desde el panel de administración o esperar al siguiente ciclo. |
| Respuesta vacía o genérica | No hay categorías asignadas o no hay documentos | Asociar categorías con contenido relevante y reintentar. |
| Error 401 al generar manifest | Usuario sin permisos | Validar que la sesión sea OWNER o ADMIN. |

Con esta configuración, cualquier organización puede habilitar un bot de Slack totalmente guiado desde GUÍA, con control granular sobre la información que expone y visibilidad completa de su uso.

