import { useCallback, useEffect, useRef } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from 'react'
import type { WorkflowConnectionDraft, WorkflowEdge, WorkflowNode, WorkflowPort } from '../../types/workflow'
import type {
  WorkflowCanvasOffset,
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
  onPortClick?: (node: WorkflowNode, portId: string, direction: 'input' | 'output') => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerEnter?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerLeave?: (node: WorkflowNode, port: WorkflowPort) => void
  activePortId?: string | null
  onCanvasPointerMove?: (point: WorkflowViewportPoint) => void
  onCanvasPan?: (offset: WorkflowCanvasOffset) => void
  onCanvasWheelZoom?: (point: WorkflowViewportPoint, deltaY: number) => void
}

interface NodeDragInteraction {
  type: 'node-drag'
  originNodeId: string
  nodeIds: string[]
  startClientX: number
  startClientY: number
  startPositions: Record<string, WorkflowViewportPoint>
  moved: boolean
}

interface PanInteraction {
  type: 'pan'
  startClientX: number
  startClientY: number
  startOffsetX: number
  startOffsetY: number
  moved: boolean
}

type InteractionState = NodeDragInteraction | PanInteraction | null

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
  const interactionRef = useRef<InteractionState>(null)
  const suppressClickNodeIdRef = useRef<string | null>(null)

  const setViewportElement = useCallback((element: HTMLElement | null) => {
    internalViewportRef.current = element
    if (viewportRef) {
      viewportRef.current = element
    }
  }, [viewportRef])

  const isBackgroundTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false
    }

    return (
      target.closest('[data-testid^="canvas-node-"]') === null &&
      target.closest('[data-testid="node-context-menu"]') === null
    )
  }, [])

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

  const clearInteraction = useCallback(() => {
    interactionRef.current = null
  }, [])

  const handleNodePointerDown = useCallback((event: ReactPointerEvent, node: WorkflowNode) => {
    event.stopPropagation()
    if (event.button !== 0 || event.ctrlKey || event.metaKey) {
      return
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

    interactionRef.current = {
      type: 'node-drag',
      originNodeId: node.id,
      nodeIds,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositions,
      moved: false
    }
  }, [nodes, onNodeClick, selectedNodeIds])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !isBackgroundTarget(event.target)) {
      return
    }

    onBackgroundClick?.()

    interactionRef.current = {
      type: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: canvasOffset.x,
      startOffsetY: canvasOffset.y,
      moved: false
    }
  }, [canvasOffset.x, canvasOffset.y, isBackgroundTarget, onBackgroundClick])

  const handleTrackedPointerMove = useCallback((clientX: number, clientY: number) => {
    const interaction = interactionRef.current

    if (!interaction) {
      const point = resolveCanvasPoint(clientX, clientY)
      if (point) {
        onCanvasPointerMove?.(point)
      }
      return
    }

    if (interaction.type === 'node-drag') {
      const dx = (clientX - interaction.startClientX) / zoom
      const dy = (clientY - interaction.startClientY) / zoom
      if (!interaction.moved && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        interaction.moved = true
      }

      const updates = Object.fromEntries(
        interaction.nodeIds.map((nodeId) => {
          const start = interaction.startPositions[nodeId]
          return [nodeId, { x: start.x + dx, y: start.y + dy }]
        })
      )
      onNodesMove?.(interaction.nodeIds, updates)
      return
    }

    if (interaction.type === 'pan') {
      const dx = clientX - interaction.startClientX
      const dy = clientY - interaction.startClientY
      if (!interaction.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        interaction.moved = true
      }

      onCanvasPan?.({
        x: interaction.startOffsetX + dx,
        y: interaction.startOffsetY + dy
      })
      return
    }

  }, [onCanvasPan, onCanvasPointerMove, onNodesMove, resolveCanvasPoint, zoom])

  const handleTrackedPointerUp = useCallback(() => {
    const interaction = interactionRef.current
    clearInteraction()

    if (!interaction) {
      return
    }

    if (interaction.type === 'node-drag') {
      if (interaction.moved) {
        suppressClickNodeIdRef.current = interaction.originNodeId
      }
      return
    }

    return
  }, [clearInteraction])

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      handleTrackedPointerMove(event.clientX, event.clientY)
    }

    const handleWindowPointerUp = () => {
      handleTrackedPointerUp()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerUp)
    }
  }, [handleTrackedPointerMove, handleTrackedPointerUp])

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

      if (event.shiftKey) {
        onCanvasPan?.({
          x: canvasOffset.x - event.deltaY,
          y: canvasOffset.y
        })
        return
      }

      onCanvasPan?.({
        x: canvasOffset.x - event.deltaX,
        y: canvasOffset.y - event.deltaY
      })
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [canvasOffset.x, canvasOffset.y, onCanvasPan, onCanvasWheelZoom, resolveViewportPoint])

  const handleBackgroundSurfaceClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!isBackgroundTarget(event.target) || interactionRef.current?.type === 'pan') {
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
    </section>
  )
}
