import { describe, expect, it } from 'vitest'
import { parseExpression, resolveFieldReference } from './expressionParser'

describe('resolveFieldReference', () => {
  const context = {
    "RSI": { rsi: 75, signal: "sell" },
    "MACD": { histogram: 0.5 }
  }

  it('resolves simple field reference', () => {
    expect(resolveFieldReference("RSI.rsi", context)).toBe(75)
  })

  it('resolves another field reference', () => {
    expect(resolveFieldReference("MACD.histogram", context)).toBe(0.5)
  })

  it('returns undefined for non-existent reference', () => {
    expect(resolveFieldReference("RSI.nonexistent", context)).toBeUndefined()
  })

  it('returns undefined for invalid format', () => {
    expect(resolveFieldReference("invalid", context)).toBeUndefined()
  })
})

describe('parseExpression', () => {
  const context = {
    "RSI": { rsi: 75, signal: "sell" },
    "MACD": { histogram: 0.5 }
  }

  it('parses simple greater than condition', () => {
    const result = parseExpression("{{RSI.rsi}} > 70", context)
    expect(result.result).toBe(true)
    expect(result.details["RSI.rsi"]).toBe(75)
  })

  it('parses simple less than condition', () => {
    const result = parseExpression("{{RSI.rsi}} < 80", context)
    expect(result.result).toBe(true)
  })

  it('parses equals condition', () => {
    const result = parseExpression("{{RSI.rsi}} == 75", context)
    expect(result.result).toBe(true)
  })

  it('parses not equals condition', () => {
    const result = parseExpression("{{RSI.rsi}} != 50", context)
    expect(result.result).toBe(true)
  })

  it('parses AND condition - true case', () => {
    const result = parseExpression("{{RSI.rsi}} > 70 AND {{MACD.histogram}} > 0", context)
    expect(result.result).toBe(true)
  })

  it('parses AND condition - false case', () => {
    const result = parseExpression("{{RSI.rsi}} > 80 AND {{MACD.histogram}} > 0", context)
    expect(result.result).toBe(false)
  })

  it('parses OR condition - true case', () => {
    const result = parseExpression("{{RSI.rsi}} > 80 OR {{MACD.histogram}} > 0", context)
    expect(result.result).toBe(true)
  })

  it('parses OR condition - false case', () => {
    const result = parseExpression("{{RSI.rsi}} > 80 OR {{MACD.histogram}} < 0", context)
    expect(result.result).toBe(false)
  })

  it('parses greater than or equal condition', () => {
    const result = parseExpression("{{RSI.rsi}} >= 75", context)
    expect(result.result).toBe(true)
  })

  it('parses less than or equal condition', () => {
    const result = parseExpression("{{RSI.rsi}} <= 75", context)
    expect(result.result).toBe(true)
  })
})
