import type { WorkflowNodePoint, WorkflowNodeType } from '../types/workflow'

export const CANVAS_NODE_WIDTH = 280

export function buildNodeId(type: WorkflowNodeType, counter: number) {
  const normalizedType = type.replace(/[^a-z]/gi, '').toLowerCase()
  const typeHash = Array.from(normalizedType).reduce(
    (acc, char) => (acc * 31 + char.charCodeAt(0)) % 100_000,
    normalizedType.length
  )
  const digits = `${Date.now()}${String(typeHash).padStart(5, '0')}`
  return `node_${digits}_${counter}`
}

export function buildEdgeId(
  fromNodeId: string,
  fromPortId: string,
  toNodeId: string,
  toPortId: string
) {
  return `edge_${fromNodeId}_${fromPortId}_${toNodeId}_${toPortId}`
}

export function snapToGrid(point: WorkflowNodePoint, gridSize: number) {
  if (gridSize <= 0) {
    return {
      x: point.x,
      y: point.y
    }
  }

  const x = Math.round(point.x / gridSize) * gridSize
  const y = Math.round(point.y / gridSize) * gridSize
  return { x, y }
}
