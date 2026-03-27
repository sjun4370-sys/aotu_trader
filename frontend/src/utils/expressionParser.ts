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

export function parseExpression(
  expression: string,
  context: ExpressionContext
): { result: boolean; details: Record<string, unknown> } {
  const details: Record<string, unknown> = {}

  let resolvedExpression = expression

  const fieldRefPattern = /\{\{([^}]+)\}\}/g
  const matches = [...expression.matchAll(fieldRefPattern)]

  for (const match of matches) {
    const reference = match[1]
    const value = resolveFieldReference(reference, context)
    details[reference] = value

    const replacement = value === null || value === undefined
      ? 'null'
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(String(value))

    resolvedExpression = resolvedExpression.replace(match[0], replacement)
  }

  const unsafePattern = /[^0-9\s+\-*/<>=!&|().A-Za-z]/
  if (unsafePattern.test(resolvedExpression)) {
    return { result: false, details }
  }

  const wordPattern = /\b(AND|OR)\b/gi
  resolvedExpression = resolvedExpression.replace(wordPattern, (match) => match.toLowerCase() === 'and' ? '&&' : '||')

  try {
    const result = new Function(`return ${resolvedExpression}`)()
    return { result: Boolean(result), details }
  } catch {
    return { result: false, details }
  }
}
