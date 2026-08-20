export interface PreviousMessage {
  role: string
  content: string
}

/**
 * Builds conversation context from previous messages
 */
export const buildConversationContext = (previousMessages: PreviousMessage[]): string => {
  if (previousMessages.length === 0) {
    return ''
  }

  return `\n\nCONTEXTO DE CONVERSACIÓN ANTERIOR:\n${previousMessages.map((msg, i) => 
    `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
  ).join('\n')}\n`
}

/**
 * Builds the complete system prompt for the AI
 */
export const buildSystemPrompt = (documentContext: string, conversationContext: string): string => {
  return `Eres un asistente experto que responde preguntas basándote únicamente en el contexto proporcionado.

CONTEXTO DE DOCUMENTOS:
${documentContext}${conversationContext}

INSTRUCCIONES:
- Responde la pregunta del usuario basándote ÚNICAMENTE en el contexto proporcionado arriba
- Si la información no está en el contexto, di claramente que no tienes esa información
- Cita las fuentes relevantes usando el formato [número] cuando sea apropiado
- Mantén coherencia con la conversación anterior si existe
- Sé preciso, claro y conciso en tus respuestas
- Responde en español`
}

/**
 * Builds a fallback title from user message
 */
export const buildFallbackTitle = (userMessage: string): string => {
  return userMessage.length > 50 
    ? userMessage.substring(0, 47) + '...'
    : userMessage
}
