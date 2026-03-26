import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from 'react'
import type { WorkflowConnectionDraft, WorkflowEdge, WorkflowNode, WorkflowPort } from '../../types/workflow'
import type {
  WorkflowCanvasOffset,
  WorkflowMarqueeRect,
  WorkflowViewportPoint
} from '../../hooks/useWorkflowCanvas'
import CanvasNode from './CanvasNode'
import EdgeLayer from './EdgeLayer'
import styles from './CanvasViewport.module.css'

interface CanvasViewportProps {
  zoom: number
  canvasOffset: WorkflowCanvasOffset
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  selectedNodeIds?: string[]
  connectionDraft?: WorkflowConnectionDraft | null
  className?: string
  children?: ReactNode
  viewportRef?: MutableRefObject<HTMLElement | null>
  onNodeClick?: (nodeId: string, additive: boolean) => void
  onNodeContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, node: WorkflowNode) => void
  onBackgroundClick?: () => void
  onNodesMove?: (nodeIds: string[], updates: Record<string, WorkflowViewportPoint>) => void
  onSelectionBoxComplete?: (nodeIds: string[], additive: boolean) => void
  onPortClick?: (node: WorkflowNode, portId: string, direction: 'input' | 'output') => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerEnter?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerLeave?: (node: WorkflowNode, port: WorkflowPort) => void
  activePortId?: string | null
  onCanvasPointerMove?: (point: WorkflowViewportPoint) => void
  onCanvasPan?: (offset: WorkflowCanvasOffset) => void
  onCanvasWheelZoom?: (point: WorkflowViewportPoint, deltaY: number) => void
}

interface DragState {
  originNodeId: string
  nodeIds: string[]
  startPointerX: number
  startPointerY: number
  startPositions: Record<string, WorkflowViewportPoint>
  moved: boolean
}

interface MarqueeState {
  startClientX: number
  startClientY: number
  additive: boolean
}

interface PanState {
  startClientX: number
  startClientY: number
  startOffsetX: number
  startOffsetY: number
  moved: boolean
}

const DRAG_THRESHOLD = 4

function normalizeRect(x1: number, y1: number, x2: number, y2: number): WorkflowMarqueeRect {
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
}

export default function CanvasViewport({
  zoom,
  canvasOffset,
  nodes = [],
  edges = [],
  selectedNodeIds = [],
  connectionDraft = null,
  className,
  children,
  viewportRef,
  onNodeClick,
  onNodeContextMenu,
  onBackgroundClick,
  onNodesMove,
  onSelectionBoxComplete,
  onPortClick,
  onPortPointerDown,
  onPortPointerEnter,
  onPortPointerLeave,
  activePortId,
  onCanvasPointerMove,
  onCanvasPan,
  onCanvasWheelZoom
}: CanvasViewportProps) {
  const internalViewportRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const marqueeRef = useRef<MarqueeState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const suppressClickNodeIdRef = useRef<string | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<WorkflowMarqueeRect | null>(null)

  const isBackgroundTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false
    }

    return target.closest('[data-testid^="canvas-node-"]') === null && target.closest('[data-testid="node-context-menu"]') === null
  }, [])

  const setViewportElement = useCallback((element: HTMLElement | null) => {
    internalViewportRef.current = element
    if (viewportRef) {
      viewportRef.current = element
    }
  }, [viewportRef])

  const resolveCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const viewport = internalViewportRef.current
    if (!viewport) {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    return {
      x: (clientX - rect.left - canvasOffset.x) / zoom,
      y: (clientY - rect.top - canvasOffset.y) / zoom
    }
  }, [canvasOffset.x, canvasOffset.y, zoom])

  const resolveViewportPoint = useCallback((clientX: number, clientY: number) => {
    const viewport = internalViewportRef.current
    if (!viewport) {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [])

  const handleNodePointerDown = useCallback((event: ReactPointerEvent, node: WorkflowNode) => {
    event.stopPropagation()
    if (event.button !== 0) {
      return
    }
    if (event.ctrlKey || event.metaKey) {
      return
    }

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    const nodeIds = selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id]
    if (!selectedNodeIds.includes(node.id)) {
      onNodeClick?.(node.id, false)
    }

    const startPositions = Object.fromEntries(
      nodes
        .filter((item) => nodeIds.includes(item.id))
        .map((item) => [item.id, { ...item.position }])
    )

    dragRef.current = {
      originNodeId: node.id,
      nodeIds,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPositions,
      moved: false
    }
  }, [nodes, onNodeClick, selectedNodeIds])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !isBackgroundTarget(event.target)) {
      return
    }

    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    if (event.ctrlKey || event.metaKey) {
      marqueeRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        additive: true
      }
      const viewportPoint = resolveViewportPoint(event.clientX, event.clientY)
      if (!viewportPoint) {
        return
      }

      setMarqueeRect({ left: viewportPoint.x, top: viewportPoint.y, width: 0, height: 0 })
      return
    }

    panRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: canvasOffset.x,
      startOffsetY: canvasOffset.y,
      moved: false
    }
  }, [canvasOffset.x, canvasOffset.y, isBackgroundTarget, resolveViewportPoint])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (drag) {
      const dx = (event.clientX - drag.startPointerX) / zoom
      const dy = (event.clientY - drag.startPointerY) / zoom
      if (!drag.moved && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        drag.moved = true
      }
      const updates = Object.fromEntries(
        drag.nodeIds.map((nodeId) => {
          const start = drag.startPositions[nodeId]
          return [nodeId, { x: start.x + dx, y: start.y + dy }]
        })
      )
      onNodesMove?.(drag.nodeIds, updates)
      return
    }

    const pan = panRef.current
    if (pan) {
      const dx = event.clientX - pan.startClientX
      const dy = event.clientY - pan.startClientY
      if (!pan.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        pan.moved = true
      }
      onCanvasPan?.({
        x: pan.startOffsetX + dx,
        y: pan.startOffsetY + dy
      })
      return
    }

    const marquee = marqueeRef.current
    if (marquee) {
      const viewportStart = resolveViewportPoint(marquee.startClientX, marquee.startClientY)
      const viewportCurrent = resolveViewportPoint(event.clientX, event.clientY)
      if (!viewportStart || !viewportCurrent) {
        return
      }

      setMarqueeRect(normalizeRect(viewportStart.x, viewportStart.y, viewportCurrent.x, viewportCurrent.y))
      return
    }

    const point = resolveCanvasPoint(event.clientX, event.clientY)
    if (point) {
      onCanvasPointerMove?.(point)
    }
  }, [onCanvasPan, onCanvasPointerMove, onNodesMove, resolveCanvasPoint, resolveViewportPoint, zoom])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.moved) {
      suppressClickNodeIdRef.current = drag.originNodeId
    }

    const pan = panRef.current
    panRef.current = null
    if (pan?.moved) {
      return
    }

    const marquee = marqueeRef.current
    marqueeRef.current = null
    if (!marquee) {
      return
    }

    const viewportStart = resolveViewportPoint(marquee.startClientX, marquee.startClientY)
    const viewportEnd = resolveViewportPoint(event.clientX, event.clientY)
    setMarqueeRect(null)
    if (!viewportStart || !viewportEnd) {
      return
    }

    const rect = normalizeRect(viewportStart.x, viewportStart.y, viewportEnd.x, viewportEnd.y)
    if (rect.width < DRAG_THRESHOLD && rect.height < DRAG_THRESHOLD) {
      if (!marquee.additive) {
        onBackgroundClick?.()
      }
      return
    }

    const canvasStart = resolveCanvasPoint(marquee.startClientX, marquee.startClientY)
    const canvasEnd = resolveCanvasPoint(event.clientX, event.clientY)
    if (!canvasStart || !canvasEnd) {
      return
    }

    const worldRect = normalizeRect(canvasStart.x, canvasStart.y, canvasEnd.x, canvasEnd.y)
    const intersectedNodeIds = nodes
      .filter((node) => {
        const nodeLeft = node.position.x
        const nodeTop = node.position.y
        const nodeRight = node.position.x + node.size.width
        const nodeBottom = node.position.y + node.size.height
        return !(
          nodeRight < worldRect.left ||
          nodeLeft > worldRect.left + worldRect.width ||
          nodeBottom < worldRect.top ||
          nodeTop > worldRect.top + worldRect.height
        )
      })
      .map((node) => node.id)

    onSelectionBoxComplete?.(intersectedNodeIds, marquee.additive)
  }, [nodes, onBackgroundClick, onSelectionBoxComplete, resolveCanvasPoint, resolveViewportPoint])

  useEffect(() => {
    const viewport = internalViewportRef.current
    if (!viewport) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const viewportPoint = resolveViewportPoint(event.clientX, event.clientY)
      if (!viewportPoint) {
        return
      }

      if (event.ctrlKey) {
        onCanvasWheelZoom?.(viewportPoint, event.deltaY)
        return
      }

      onCanvasPan?.({
        x: canvasOffset.x - (event.shiftKey ? event.deltaY : event.deltaX),
        y: canvasOffset.y - event.deltaY
      })
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [canvasOffset.x, canvasOffset.y, onCanvasPan, onCanvasWheelZoom, resolveViewportPoint])

  const handleBackgroundSurfaceClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!isBackgroundTarget(event.target) || marqueeRef.current || dragRef.current || panRef.current?.moved) {
      return
    }
    onBackgroundClick?.()
  }, [isBackgroundTarget, onBackgroundClick])

  const handleNodeClick = useCallback((nodeId: string, additive: boolean) => {
    if (suppressClickNodeIdRef.current === nodeId) {
      suppressClickNodeIdRef.current = null
      return
    }

    onNodeClick?.(nodeId, additive)
  }, [onNodeClick])

  const dotGridSize = 24 * zoom

  return (
    <section
      ref={setViewportElement}
      data-testid="workflow-canvas"
      className={[styles.viewport, className].filter(Boolean).join(' ')}
      onClick={handleBackgroundSurfaceClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={styles.grid}
        data-testid="workflow-grid"
        style={{
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
          backgroundSize: `${dotGridSize}px ${dotGridSize}px`
        }}
      />
      <div
        className={styles.content}
        data-testid="workflow-content"
        style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})` }}
        onClick={handleBackgroundSurfaceClick}
      >
        <EdgeLayer
          edges={edges}
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          connectionDraft={connectionDraft}
        />
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            isSelected={selectedNodeIds.includes(node.id)}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPointerDown={handleNodePointerDown}
            onPortClick={(workflowNode, port) => onPortClick?.(workflowNode, port.id, port.direction)}
            onPortPointerDown={onPortPointerDown}
            onPortPointerEnter={onPortPointerEnter}
            onPortPointerLeave={onPortPointerLeave}
            activePortId={activePortId && node.inputs.some((port) => port.id === activePortId) ? activePortId : null}
          />
        ))}
        {children}
        {nodes.length === 0 && !children ? (
          <p className={styles.emptyText}>拖拽左侧节点到画布开始构建工作流</p>
        ) : null}
      </div>
      {marqueeRect ? (
        <div
          className={styles.marquee}
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height
          }}
          data-testid="workflow-marquee"
        />
      ) : null}
    </section>
  )
}
