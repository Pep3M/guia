import { generateText } from 'ai'
import { chatModel } from './provider'

/**
 * Genera un título inteligente para una conversación basado en los primeros mensajes
 * @param userMessage El mensaje del usuario
 * @param assistantMessage La respuesta del asistente
 * @returns Un título conciso y descriptivo
 */
export const generateConversationTitle = async (
  userMessage: string,
  assistantMessage?: string
): Promise<string> => {
  try {
    const prompt = `Genera un título conciso y descriptivo para una conversación basado en el siguiente intercambio:

Usuario: ${userMessage}
${assistantMessage ? `Asistente: ${assistantMessage}` : ''}

Requisitos del título:
- Máximo 60 caracteres
- Descriptivo pero conciso
- En español
- Sin comillas ni caracteres especiales innecesarios
- Debe capturar la esencia principal de la conversación
- Si es una pregunta, incluye el tema principal
- Si es una consulta, incluye el área de interés

Ejemplos de buenos títulos:
- "Consulta sobre políticas de RRHH"
- "Análisis de datos de ventas"
- "Problema con sistema de facturación"
- "Pregunta sobre procedimientos de calidad"

Responde SOLO con el título, sin explicaciones adicionales.`

    const result = await generateText({
      model: chatModel(),
      prompt,
      maxOutputTokens: 100,
      temperature: 0.3, // Baja temperatura para mayor consistencia
    })

    // Limpiar y validar el título generado
    let title = result.text.trim()
    
    // Remover comillas si las hay
    title = title.replace(/^["']|["']$/g, '')
    
    // Limitar a 60 caracteres
    if (title.length > 60) {
      title = title.substring(0, 57) + '...'
    }
    
    // Fallback si el título está vacío o es muy corto
    if (!title || title.length < 3) {
      title = userMessage.length > 50 
        ? userMessage.substring(0, 47) + '...'
        : userMessage
    }

    return title
  } catch (error) {
    console.error('Error generating conversation title:', error)
    
    // Fallback a título simple basado en el mensaje del usuario
    const fallbackTitle = userMessage.length > 50 
      ? userMessage.substring(0, 47) + '...'
      : userMessage
    
    return fallbackTitle
  }
}

/**
 * Genera un título en streaming para mostrar progreso al usuario
 * @param userMessage El mensaje del usuario
 * @param onTitleUpdate Callback que se ejecuta cuando el título se actualiza
 * @returns El título final generado
 */
export const generateConversationTitleStreaming = async (
  userMessage: string,
  onTitleUpdate?: (title: string) => void
): Promise<string> => {
  try {
    // Primero mostrar un título temporal mientras se genera
    const tempTitle = userMessage.length > 50 
      ? userMessage.substring(0, 47) + '...'
      : userMessage
    
    if (onTitleUpdate) {
      onTitleUpdate(`Generando título...`)
    }

    const title = await generateConversationTitle(userMessage)
    
    if (onTitleUpdate) {
      onTitleUpdate(title)
    }

    return title
  } catch (error) {
    console.error('Error generating streaming title:', error)
    
    const fallbackTitle = userMessage.length > 50 
      ? userMessage.substring(0, 47) + '...'
      : userMessage
    
    if (onTitleUpdate) {
      onTitleUpdate(fallbackTitle)
    }
    
    return fallbackTitle
  }
}
