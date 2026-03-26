import { describe, expect, it } from 'vitest'
import * as tokens from './tokens.css?inline'

describe('workflow tokens', () => {
  it('exports all required tokens', () => {
    const required = [
      '--wf-bg',
      '--wf-surface',
      '--wf-surface-strong',
      '--wf-text',
      '--wf-muted',
      '--wf-node-currency',
      '--wf-node-data',
      '--wf-node-strategy',
      '--wf-node-ai',
      '--wf-node-tool',
      '--wf-radius-card',
      '--wf-radius-panel',
      '--wf-blur-md',
      '--wf-blur-lg',
      '--wf-duration-fast',
      '--wf-duration-medium'
    ]

    const css = tokens.default as string
    required.forEach((token) => {
      expect(css).toContain(token)
    })
  })
})
