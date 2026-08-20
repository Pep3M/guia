import { countTokens as gptCountTokens } from 'gpt-tokenizer/encoding/cl100k_base'

import { CHAT_MODEL } from './provider'

/**
 * Precios por 1M de tokens. Sólo sirven para estimar coste cuando se usa un
 * proveedor de pago; con modelos autohospedados el coste registrado es 0.
 */
export const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.6, // $0.60 per 1M output tokens
  },
  'text-embedding-3-small': {
    input: 0.02, // $0.02 per 1M tokens
    output: 0, // No output tokens for embeddings
  },
}

// Cualquier identificador de modelo es válido: el conjunto depende del proveedor configurado.
export type SupportedModel = string

/**
 * Calculate the number of tokens in a text using gpt-tokenizer
 * @param text - The text to tokenize
 * @param model - The model to use for tokenization (currently both models use cl100k_base encoding)
 * @returns Number of tokens
 */
export function calculateTokens(text: string, model: SupportedModel = CHAT_MODEL): number {
  if (!text || text.length === 0) {
    return 0
  }

  try {
    // Use countTokens method which is optimized for counting
    // cl100k_base es una aproximación razonable para cualquier modelo moderno
    const tokenCount = gptCountTokens(text)
    return tokenCount
  } catch (error) {
    console.error(`[TOKEN-CALC] Error calculating tokens for model ${model}:`, error)
    // Fallback: rough estimate (1 token ≈ 3.5 characters) only if encoding fails
    return Math.ceil(text.length / 3.5)
  }
}

/**
 * Calculate the cost in USD for a given number of tokens
 * @param tokensInput - Number of input tokens
 * @param tokensOutput - Number of output tokens
 * @param model - The model being used
 * @returns Cost in USD
 */
export function calculateCost(
  tokensInput: number,
  tokensOutput: number,
  model: SupportedModel
): number {
  const pricing = PRICING[model]

  // Modelo sin tarifa conocida (típicamente autohospedado): coste 0.
  if (!pricing) {
    return 0
  }

  const inputCost = (tokensInput / 1_000_000) * pricing.input
  const outputCost = (tokensOutput / 1_000_000) * pricing.output
  
  return inputCost + outputCost
}

/**
 * Calculate tokens and cost for a text
 * @param text - The text to analyze
 * @param model - The model being used
 * @param hasOutput - Whether this operation produces output tokens
 * @param outputText - Optional output text to calculate output tokens
 * @returns Object with tokens and cost information
 */
export function calculateTokensAndCost(
  text: string,
  model: SupportedModel,
  hasOutput: boolean = false,
  outputText?: string
): {
  tokensInput: number
  tokensOutput: number
  tokensTotal: number
  costUSD: number
} {
  const tokensInput = calculateTokens(text, model)
  const tokensOutput = hasOutput && outputText ? calculateTokens(outputText, model) : 0
  const tokensTotal = tokensInput + tokensOutput
  const costUSD = calculateCost(tokensInput, tokensOutput, model)
  
  return {
    tokensInput,
    tokensOutput,
    tokensTotal,
    costUSD,
  }
}

/**
 * Format cost to USD string with appropriate precision
 * @param costUSD - Cost in USD
 * @returns Formatted string
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) {
    return `$${costUSD.toFixed(4)}`
  }
  return `$${costUSD.toFixed(2)}`
}

/**
 * Format number of tokens with commas
 * @param tokens - Number of tokens
 * @returns Formatted string
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString()
}

