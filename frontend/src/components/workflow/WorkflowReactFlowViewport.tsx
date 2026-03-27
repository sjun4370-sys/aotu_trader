import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  applyNodeChanges,
  Background,
  type Node,
  type NodeChange,
  type NodeProps,
  ReactFlow,
  type Viewport,
} from '@xyflow/react'
import type { WorkflowCanvasOffset, WorkflowViewportPoint } from '../../hooks/useWorkflowCanvas'
import type { WorkflowConnectionDraft, WorkflowEdge, WorkflowNode, WorkflowPort } from '../../types/workflow'
import WorkflowNodeCard from './WorkflowNodeCard'
import EdgeLayer from './EdgeLayer'
import CurrencyNodeContent from './node-content/CurrencyNodeContent'
import DataNodeContent from './node-content/DataNodeContent'
import StrategyNodeContent from './node-content/StrategyNodeContent'
import AINodeContent from './node-content/AINodeContent'
import ToolNodeContent from './node-content/ToolNodeContent'

interface WorkflowReactFlowViewportProps {
  zoom: number
  canvasOffset: WorkflowCanvasOffset
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeIds: string[]
  connectionDraft?: WorkflowConnectionDraft | null
  className?: string
  viewportRef?: MutableRefObject<HTMLElement | null>
  onNodeClick?: (nodeId: string, additive: boolean) => void
  onNodeContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, node: WorkflowNode) => void
  onBackgroundClick?: () => void
  onNodesMove?: (nodeIds: string[], updates: Record<string, WorkflowViewportPoint>) => void
  onPortClick?: (node: WorkflowNode, portId: string, direction: 'input' | 'output') => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerEnter?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerLeave?: (node: WorkflowNode, port: WorkflowPort) => void
  activePortId?: string | null
  onViewportLiveChange?: (viewport: Viewport) => void
  onViewportCommit?: (viewport: Viewport) => void
}

interface WorkflowReactFlowNodeData extends Record<string, unknown> {
  workflowNode: WorkflowNode
  activePortId?: string | null
  onNodeClick?: (nodeId: string, additive: boolean) => void
  onNodeContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, node: WorkflowNode) => void
  onPortClick?: (node: WorkflowNode, portId: string, direction: 'input' | 'output') => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerEnter?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerLeave?: (node: WorkflowNode, port: WorkflowPort) => void
}

function NodeContent({ node }: { node: WorkflowNode }) {
  switch (node.category) {
    case 'currency':
      return <CurrencyNodeContent node={node} />
    case 'data':
      return <DataNodeContent node={node} />
    case 'strategy':
      return <StrategyNodeContent node={node} />
    case 'ai':
      return <AINodeContent node={node} />
    case 'tool':
      return <ToolNodeContent node={node} />
  }
}

function WorkflowReactFlowNodeComponent({ data, selected, dragging }: NodeProps<Node<WorkflowReactFlowNodeData>>) {
  const node = data.workflowNode

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      style={{ pointerEvents: 'all', position: 'relative', zIndex: 1 }}
      tabIndex={0}
      aria-label={`工作流节点 ${node.label}`}
      aria-pressed={selected ? 'true' : 'false'}
      data-node-status={node.status}
      onClick={(event) => {
        event.stopPropagation()
        data.onNodeClick?.(node.id, event.ctrlKey || event.metaKey)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        data.onNodeContextMenu?.(event, node)
      }}
    >
      <WorkflowNodeCard
        title={node.label}
        category={node.category}
        status={node.status}
        selected={selected}
        dragging={dragging}
        inputs={node.inputs}
        outputs={node.outputs}
        onPortClick={(event, port) => {
          event.stopPropagation()
          data.onPortClick?.(node, port.id, port.direction)
        }}
        onPortPointerDown={(event, port) => {
          event.stopPropagation()
          data.onPortPointerDown?.(event, node, port)
        }}
        onPortPointerUp={(event, port) => {
          event.stopPropagation()
          data.onPortPointerUp?.(event, node, port)
        }}
        onPortPointerEnter={(port) => data.onPortPointerEnter?.(node, port)}
        onPortPointerLeave={(port) => data.onPortPointerLeave?.(node, port)}
        activePortId={data.activePortId}
      >
        <NodeContent node={node} />
      </WorkflowNodeCard>
    </div>
  )
}

const WorkflowReactFlowNode = memo(
  WorkflowReactFlowNodeComponent,
  (previousProps, nextProps) => (
    previousProps.selected === nextProps.selected &&
    previousProps.dragging === nextProps.dragging &&
    previousProps.data.workflowNode === nextProps.data.workflowNode &&
    previousProps.data.activePortId === nextProps.data.activePortId &&
    previousProps.data.onNodeClick === nextProps.data.onNodeClick &&
    previousProps.data.onNodeContextMenu === nextProps.data.onNodeContextMenu &&
    previousProps.data.onPortClick === nextProps.data.onPortClick &&
    previousProps.data.onPortPointerDown === nextProps.data.onPortPointerDown &&
    previousProps.data.onPortPointerUp === nextProps.data.onPortPointerUp &&
    previousProps.data.onPortPointerEnter === nextProps.data.onPortPointerEnter &&
    previousProps.data.onPortPointerLeave === nextProps.data.onPortPointerLeave
  )
)

const workflowNodeTypes = {
  workflowNode: WorkflowReactFlowNode,
}

export default function WorkflowReactFlowViewport({
  zoom,
  canvasOffset,
  nodes,
  edges,
  selectedNodeIds,
  connectionDraft,
  className,
  viewportRef,
  onNodeClick,
  onNodeContextMenu,
  onBackgroundClick,
  onNodesMove,
  onPortClick,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerLeave,
  activePortId,
  onViewportLiveChange,
  onViewportCommit,
}: WorkflowReactFlowViewportProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const draggingNodeIdsRef = useRef<string[]>([])
  const [localViewport, setLocalViewport] = useState<Viewport>({
    x: canvasOffset.x,
    y: canvasOffset.y,
    zoom,
  })

  // React Flow 内部节点状态，用 applyNodeChanges 驱动，避免拖动时外部 nodes prop 覆盖内部位置
  const [rfNodes, setRfNodes] = useState<Node<WorkflowReactFlowNodeData>[]>([])

  const setWrapperRef = useCallback((element: HTMLDivElement | null) => {
    wrapperRef.current = element
    if (viewportRef) {
      viewportRef.current = element
    }
  }, [viewportRef])

  useEffect(() => {
    const syncViewport = () => {
      setLocalViewport((current) => {
        if (current.x === canvasOffset.x && current.y === canvasOffset.y && current.zoom === zoom) {
          return current
        }

        return {
          x: canvasOffset.x,
          y: canvasOffset.y,
          zoom,
        }
      })
    }

    const frameId = requestAnimationFrame(syncViewport)
    return () => cancelAnimationFrame(frameId)
  }, [canvasOffset.x, canvasOffset.y, zoom])

  // 外部 nodes 变化时同步到 rfNodes，但拖动期间只更新非拖动节点的非位置字段
  useEffect(() => {
    setRfNodes((current) => {
      const currentById = new Map(current.map((n) => [n.id, n]))
      const dragging = draggingNodeIdsRef.current

      const next = nodes.map((node) => {
        const existing = currentById.get(node.id)
        const isDragging = dragging.includes(node.id)

        const data: WorkflowReactFlowNodeData = {
          workflowNode: node,
          activePortId: activePortId && node.inputs.some((p) => p.id === activePortId) ? activePortId : null,
          onNodeClick,
          onNodeContextMenu,
          onPortClick,
          onPortPointerDown,
          onPortPointerUp,
          onPortPointerEnter,
          onPortPointerLeave,
        }

        if (!existing) {
          return {
            id: node.id,
            type: 'workflowNode' as const,
            position: node.position,
            selected: selectedNodeIds.includes(node.id),
            draggable: true,
            selectable: false,
            data,
          }
        }

        return {
          ...existing,
          // 拖动中保留 React Flow 内部位置，不用外部 position 覆盖
          position: isDragging ? existing.position : node.position,
          selected: selectedNodeIds.includes(node.id),
          data,
        }
      })

      return next
    })
  }, [nodes, selectedNodeIds, activePortId, onNodeClick, onNodeContextMenu, onPortClick, onPortPointerDown, onPortPointerUp, onPortPointerEnter, onPortPointerLeave])

  const handleNodesChange = useCallback((changes: NodeChange<Node<WorkflowReactFlowNodeData>>[]) => {
    setRfNodes((current) => applyNodeChanges(changes, current))
  }, [])

  // 用于 EdgeLayer 的节点位置（从 rfNodes 取，保持与 React Flow 渲染同步）
  const edgeLayerNodes = useMemo<WorkflowNode[]>(() => (
    rfNodes.map((rfNode) => {
      const workflowNode = rfNode.data.workflowNode
      return rfNode.position === workflowNode.position
        ? workflowNode
        : { ...workflowNode, position: rfNode.position }
    })
  ), [rfNodes])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const wrapper = wrapperRef.current
    if (!wrapper) {
      return
    }

    const rect = wrapper.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }

      setLocalViewport((current) => {
        let nextViewport = current

        if (event.ctrlKey) {
          const nextZoom = Math.min(1.8, Math.max(0.5, Math.round((current.zoom + (event.deltaY < 0 ? 0.1 : -0.1)) * 10) / 10))
          if (nextZoom === current.zoom) {
            return current
          }

          const worldX = (point.x - current.x) / current.zoom
          const worldY = (point.y - current.y) / current.zoom
          nextViewport = {
            x: point.x - worldX * nextZoom,
            y: point.y - worldY * nextZoom,
            zoom: nextZoom,
          }
        } else if (event.shiftKey) {
          nextViewport = {
            ...current,
            x: current.x - event.deltaY,
          }
        } else {
          nextViewport = {
            ...current,
            x: current.x - event.deltaX,
            y: current.y - event.deltaY,
          }
        }

        onViewportLiveChange?.(nextViewport)
        return nextViewport
      })
  }, [onViewportLiveChange])

  const handleNodeDragStop = useCallback((_event: ReactMouseEvent, node: Node<WorkflowReactFlowNodeData>) => {
    draggingNodeIdsRef.current = draggingNodeIdsRef.current.filter((id) => id !== node.id)
    onNodesMove?.([node.id], {
      [node.id]: {
        x: node.position.x,
        y: node.position.y,
      },
    })
  }, [onNodesMove])

  const handleNodeDrag = useCallback((_event: ReactMouseEvent, node: Node<WorkflowReactFlowNodeData>) => {
    if (!draggingNodeIdsRef.current.includes(node.id)) {
      draggingNodeIdsRef.current = [...draggingNodeIdsRef.current, node.id]
    }
  }, [])

  const handleMove = useCallback((_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
    setLocalViewport(nextViewport)
    onViewportLiveChange?.(nextViewport)
  }, [onViewportLiveChange])

  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
    onViewportCommit?.(nextViewport)
  }, [onViewportCommit])

  const handleWrapperPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.closest('.react-flow__node')) {
      return
    }

    if (target.closest('.react-flow__pane') || target.closest('.react-flow__background')) {
      onBackgroundClick?.()
    }
  }, [onBackgroundClick])

  return (
    <div
      ref={setWrapperRef}
      data-testid="workflow-canvas"
      className={className}
      onWheel={handleWheel}
      onClick={onBackgroundClick}
      onPointerDownCapture={handleWrapperPointerDown}
    >
      <div
        data-testid="workflow-content"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${localViewport.x}px, ${localViewport.y}px) scale(${localViewport.zoom})`,
        }}
      />
      <ReactFlow
        nodes={rfNodes}
        edges={[]}
        nodeTypes={workflowNodeTypes}
        fitView={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnDrag={[0]}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        viewport={localViewport}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onNodesChange={handleNodesChange}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onlyRenderVisibleElements={false}
        onPaneClick={onBackgroundClick}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.5} color="rgba(148, 163, 184, 0.35)" />
      </ReactFlow>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          transform: `translate(${localViewport.x}px, ${localViewport.y}px) scale(${localViewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <EdgeLayer
          edges={edges}
          nodes={edgeLayerNodes}
          selectedNodeIds={selectedNodeIds}
          connectionDraft={connectionDraft}
          draggingNodeIds={draggingNodeIdsRef.current}
        />
      </div>
    </div>
  )
}
