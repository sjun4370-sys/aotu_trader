import { useCallback, useState } from 'react'
import type { WorkflowEdge, WorkflowNode, WorkflowNodePoint } from '../types/workflow'

export interface WorkflowCanvasOffset {
  x: number
  y: number
}

export interface WorkflowCanvasDragState {
  nodeId: string
  startPoint: WorkflowNodePoint
  currentPoint: WorkflowNodePoint
}

export interface WorkflowViewportPoint {
  x: number
  y: number
}

export interface WorkflowMarqueeRect {
  left: number
  top: number
  width: number
  height: number
}

export const WORKFLOW_CANVAS_MIN_ZOOM = 0.5
export const WORKFLOW_CANVAS_MAX_ZOOM = 1.8
export const WORKFLOW_CANVAS_ZOOM_STEP = 0.1

const roundZoom = (zoom: number) => Math.round(zoom * 10) / 10

const clampZoom = (zoom: number) => {
  if (!Number.isFinite(zoom)) {
    return 1
  }

  return Math.min(WORKFLOW_CANVAS_MAX_ZOOM, Math.max(WORKFLOW_CANVAS_MIN_ZOOM, roundZoom(zoom)))
}

export function useWorkflowCanvas() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])
  const [zoom, setZoomState] = useState<number>(1)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [dragState, setDragState] = useState<WorkflowCanvasDragState | null>(null)
  const [canvasOffset, setCanvasOffset] = useState<WorkflowCanvasOffset>({ x: 0, y: 0 })

  const setZoom = useCallback((nextZoom: number) => {
    setZoomState(clampZoom(nextZoom))
  }, [])

  const zoomIn = useCallback(() => {
    setZoomState((previousZoom) => clampZoom(previousZoom + WORKFLOW_CANVAS_ZOOM_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setZoomState((previousZoom) => clampZoom(previousZoom - WORKFLOW_CANVAS_ZOOM_STEP))
  }, [])

  const resetView = useCallback(() => {
    setZoomState(1)
    setCanvasOffset({ x: 0, y: 0 })
  }, [])

  const zoomAtPoint = useCallback((nextZoom: number, point: WorkflowViewportPoint) => {
    setZoomState((previousZoom) => {
      const clampedZoom = clampZoom(nextZoom)
      if (clampedZoom === previousZoom) {
        return previousZoom
      }

      setCanvasOffset((previousOffset) => {
        const worldX = (point.x - previousOffset.x) / previousZoom
        const worldY = (point.y - previousOffset.y) / previousZoom
        return {
          x: point.x - worldX * clampedZoom,
          y: point.y - worldY * clampedZoom
        }
      })

      return clampedZoom
    })
  }, [])

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    selectedNodeIds,
    setSelectedNodeIds,
    dragState,
    setDragState,
    canvasOffset,
    setCanvasOffset,
    resetView
  }
}
