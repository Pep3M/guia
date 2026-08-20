import { describe, test, expect } from 'vitest'
import { 
  calculateTokens, 
  calculateCost, 
  calculateTokensAndCost,
  formatCost,
  formatTokens,
  PRICING
} from '@/lib/ai/token-calculator'

describe('Token Calculator', () => {
  describe('calculateTokens', () => {
    test('calculates tokens for a simple text', () => {
      const text = 'Hello, world!'
      const tokens = calculateTokens(text, 'gpt-4o-mini')
      
      // Should return a positive number
      expect(tokens).toBeGreaterThan(0)
      // gpt-tokenizer should give exact count (typically 3-4 tokens for "Hello, world!")
      expect(tokens).toBeLessThan(10)
    })

    test('calculates tokens for empty string', () => {
      const tokens = calculateTokens('', 'gpt-4o-mini')
      expect(tokens).toBe(0)
    })

    test('calculates more tokens for longer text', () => {
      const shortText = 'Hello'
      const longText = 'Hello, this is a much longer text with many more words and tokens'
      
      const shortTokens = calculateTokens(shortText, 'gpt-4o-mini')
      const longTokens = calculateTokens(longText, 'gpt-4o-mini')
      
      expect(longTokens).toBeGreaterThan(shortTokens)
      // Verify longer text has significantly more tokens
      expect(longTokens).toBeGreaterThan(shortTokens * 5)
    })

    test('handles special characters', () => {
      const text = '🚀 Hello! @#$% Testing 123'
      const tokens = calculateTokens(text, 'gpt-4o-mini')
      
      expect(tokens).toBeGreaterThan(0)
    })

    test('works with both models using cl100k_base', () => {
      const text = 'This is a test'
      const gptTokens = calculateTokens(text, 'gpt-4o-mini')
      const embeddingTokens = calculateTokens(text, 'text-embedding-3-small')
      
      // Both should use same encoding (cl100k_base) so same token count
      expect(gptTokens).toBe(embeddingTokens)
      expect(gptTokens).toBeGreaterThan(0)
    })

    test('handles multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3'
      const tokens = calculateTokens(text, 'gpt-4o-mini')
      
      expect(tokens).toBeGreaterThan(0)
    })

    test('countTokens vs encode().length comparison', async () => {
      // Import both methods to compare
      const { encode, countTokens: gptCount } = await import('gpt-tokenizer/encoding/cl100k_base')
      
      const testTexts = [
        'Hello, world!',
        'This is a longer text with multiple sentences. It should have more tokens.',
        'Special chars: 🚀 @#$% 123',
        'Multiline\ntext\nhere',
      ]

      for (const text of testTexts) {
        const encodeLength = encode(text).length
        const countTokensResult = gptCount(text)
        
        console.log(`Text: "${text.substring(0, 30)}..."`)
        console.log(`  encode().length: ${encodeLength}`)
        console.log(`  countTokens(): ${countTokensResult}`)
        
        // They should always be the same
        expect(countTokensResult).toBe(encodeLength)
      }
    })
  })

  describe('calculateCost', () => {
    test('calculates cost for gpt-4o-mini correctly', () => {
      const inputTokens = 1_000_000 // 1M tokens
      const outputTokens = 1_000_000 // 1M tokens
      
      const cost = calculateCost(inputTokens, outputTokens, 'gpt-4o-mini')
      
      // Should be $0.15 + $0.60 = $0.75
      expect(cost).toBe(0.75)
    })

    test('calculates cost for text-embedding-3-small correctly', () => {
      const inputTokens = 1_000_000 // 1M tokens
      const outputTokens = 0 // No output for embeddings
      
      const cost = calculateCost(inputTokens, outputTokens, 'text-embedding-3-small')
      
      // Should be $0.02
      expect(cost).toBe(0.02)
    })

    test('handles small token counts', () => {
      const inputTokens = 100
      const outputTokens = 100
      
      const cost = calculateCost(inputTokens, outputTokens, 'gpt-4o-mini')
      
      // Should be a very small cost
      expect(cost).toBeLessThan(0.001)
      expect(cost).toBeGreaterThan(0)
    })

    test('returns zero cost for zero tokens', () => {
      const cost = calculateCost(0, 0, 'gpt-4o-mini')
      expect(cost).toBe(0)
    })
  })

  describe('calculateTokensAndCost', () => {
    test('calculates tokens and cost for input only', () => {
      const text = 'Hello, world!'
      const result = calculateTokensAndCost(text, 'gpt-4o-mini', false)
      
      expect(result.tokensInput).toBeGreaterThan(0)
      expect(result.tokensOutput).toBe(0)
      expect(result.tokensTotal).toBe(result.tokensInput)
      expect(result.costUSD).toBeGreaterThan(0)
    })

    test('calculates tokens and cost for input and output', () => {
      const inputText = 'Hello, world!'
      const outputText = 'Hi there! How can I help you today?'
      const result = calculateTokensAndCost(inputText, 'gpt-4o-mini', true, outputText)
      
      expect(result.tokensInput).toBeGreaterThan(0)
      expect(result.tokensOutput).toBeGreaterThan(0)
      expect(result.tokensTotal).toBe(result.tokensInput + result.tokensOutput)
      expect(result.costUSD).toBeGreaterThan(0)
    })

    test('handles embeddings model', () => {
      const text = 'This is a document to embed'
      const result = calculateTokensAndCost(text, 'text-embedding-3-small', false)
      
      expect(result.tokensInput).toBeGreaterThan(0)
      expect(result.tokensOutput).toBe(0)
      expect(result.tokensTotal).toBe(result.tokensInput)
      expect(result.costUSD).toBeGreaterThan(0)
    })
  })

  describe('formatCost', () => {
    test('formats large costs with 2 decimals', () => {
      expect(formatCost(1.50)).toBe('$1.50')
      expect(formatCost(0.15)).toBe('$0.15')
    })

    test('formats very small costs with 4 decimals', () => {
      expect(formatCost(0.0015)).toBe('$0.0015')
      expect(formatCost(0.0001)).toBe('$0.0001')
    })

    test('handles zero cost', () => {
      expect(formatCost(0)).toBe('$0.0000')
    })
  })

  describe('formatTokens', () => {
    test('formats tokens with commas', () => {
      expect(formatTokens(1000)).toBe('1,000')
      expect(formatTokens(1000000)).toBe('1,000,000')
    })

    test('formats small numbers without commas', () => {
      expect(formatTokens(100)).toBe('100')
      expect(formatTokens(999)).toBe('999')
    })
  })

  describe('PRICING constants', () => {
    test('has correct pricing for gpt-4o-mini', () => {
      expect(PRICING['gpt-4o-mini'].input).toBe(0.15)
      expect(PRICING['gpt-4o-mini'].output).toBe(0.6)
    })

    test('has correct pricing for text-embedding-3-small', () => {
      expect(PRICING['text-embedding-3-small'].input).toBe(0.02)
      expect(PRICING['text-embedding-3-small'].output).toBe(0)
    })
  })
})

