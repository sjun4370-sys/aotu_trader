interface ExpressionContext {
  [key: string]: {
    [field: string]: unknown
  }
}

export function resolveFieldReference(
  reference: string,
  context: ExpressionContext
): unknown {
  const parts = reference.split('.')
  if (parts.length !== 2) {
    return undefined
  }
  const [nodeName, field] = parts
  return context[nodeName]?.[field]
}

const SAFE_PATTERN = /^[0-9\s+\-*/<>=!&|().'",\[\]]+$/
const FORBIDDEN_PATTERNS = [
  /\bfunction\b/i,
  /\breturn\b/i,
  /\bnew\b/i,
  /\bthis\b/i,
  /\bwindow\b/i,
  /\bdocument\b/i,
  /\beval\b/i,
  /\bFunction\b/i,
  /\bObject\b/i,
  /\bArray\b/i,
  /\bString\b/i,
  /\bNumber\b/i,
  /\bBoolean\b/i,
  /\bMath\b/i,
  /\bJSON\b/i,
  /\bconsole\b/i,
  /\bimport\b/i,
  /\bexport\b/i,
  /\bclass\b/i,
  /\bextends\b/i,
  /\bsuper\b/i,
  /\bconstructor\b/i,
  /\bprototype\b/i,
  /\b__proto__\b/i,
  /\bconstructor\b/i,
]

function isSafeExpression(expr: string): boolean {
  if (!SAFE_PATTERN.test(expr)) {
    return false
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(expr)) {
      return false
    }
  }
  return true
}

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'string') {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
    return `"${escaped}"`
  }
  return 'null'
}

export function parseExpression(
  expression: string,
  context: ExpressionContext
): { result: boolean; details: Record<string, unknown> } {
  const details: Record<string, unknown> = {}

  let resolvedExpression = expression

  const fieldRefPattern = /\{\{([^}]+)\}\}/g
  const matches = [...expression.matchAll(fieldRefPattern)]

  for (const match of matches) {
    const reference = match[1].trim()
    const value = resolveFieldReference(reference, context)
    details[reference] = value
    const replacement = escapeValue(value)
    resolvedExpression = resolvedExpression.replace(match[0], replacement)
  }

  if (!isSafeExpression(resolvedExpression)) {
    return { result: false, details: { ...details, error: 'Unsafe expression detected' } }
  }

  const wordPattern = /\b(AND|OR)\b/gi
  resolvedExpression = resolvedExpression.replace(wordPattern, (match) =>
    match.toLowerCase() === 'and' ? '&&' : '||'
  )

  try {
    const fn = new Function(`"use strict"; return (${resolvedExpression})`)
    const result = fn()
    return { result: Boolean(result), details }
  } catch (error) {
    return { result: false, details: { ...details, error: String(error) } }
  }
}
