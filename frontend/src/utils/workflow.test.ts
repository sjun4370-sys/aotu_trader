import { describe, expect, it } from 'vitest'
import { buildEdgeId, buildNodeId, snapToGrid } from './workflow'

describe('workflow helpers', () => {
  it('snaps points to a consistent grid size', () => {
    expect(snapToGrid({ x: 37, y: 45 }, 8)).toEqual({ x: 40, y: 48 })
  })

  it('builds node ids with sanitized format', () => {
    expect(buildNodeId('currency', 2)).toMatch(/^node_\d+_2$/)
  })

  it('builds edges from node directions', () => {
    expect(buildEdgeId('node_a', 'out', 'node_b', 'in')).toBe('edge_node_a_out_node_b_in')
  })
})
