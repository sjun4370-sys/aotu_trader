import type {
  WorkflowNode,
  WorkflowNodePoint,
  WorkflowNodeType,
  WorkflowPortDirection,
} from '../types/workflow'

export const CANVAS_NODE_WIDTH = 280
export const CANVAS_NODE_HEIGHT = 120

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

export function getPortOffset(index: number, total: number) {
  return ((index + 1) / (total + 1)) * 100
}

export function getPortPoint(node: WorkflowNode, portId: string, direction: WorkflowPortDirection) {
  const ports = direction === 'output' ? node.outputs : node.inputs
  const portIndex = ports.findIndex((port) => port.id === portId)
  if (portIndex === -1) {
    return null
  }

  return {
    x: direction === 'output' ? node.position.x + CANVAS_NODE_WIDTH : node.position.x,
    y: node.position.y + (CANVAS_NODE_HEIGHT * getPortOffset(portIndex, ports.length)) / 100,
  }
}

export function getCanvasPointFromClient(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top'>,
  viewport: Pick<WorkflowNodePoint, 'x' | 'y'> & { zoom: number }
): WorkflowNodePoint {
  return {
    x: (clientX - rect.left - viewport.x) / viewport.zoom,
    y: (clientY - rect.top - viewport.y) / viewport.zoom,
  }
}
