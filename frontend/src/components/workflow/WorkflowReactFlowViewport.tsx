import { useCallback, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import {
  Background,
  BaseEdge,
  type Edge,
  type EdgeProps,
  getBezierPath,
  type Node,
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
  onCanvasPan?: (offset: WorkflowCanvasOffset) => void
  onCanvasWheelZoom?: (point: WorkflowViewportPoint, deltaY: number) => void
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

interface WorkflowReactFlowEdgeData extends Record<string, unknown> {
  disabled: boolean
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

function WorkflowReactFlowNode({ data, selected }: NodeProps<Node<WorkflowReactFlowNodeData>>) {
  const node = data.workflowNode

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      style={{ pointerEvents: 'all', position: 'relative', zIndex: 1 }}
      tabIndex={0}
      aria-label={`工作流节点 ${node.label}`}
      aria-pressed={selected ? 'true' : 'false'}
      data-node-status={node.status}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
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

function WorkflowReactFlowEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<Edge<WorkflowReactFlowEdgeData>>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: data?.disabled ? '#94a3b8' : '#2563eb',
        strokeWidth: 2,
        opacity: data?.disabled ? 0.7 : 1,
      }}
    />
  )
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
  onCanvasPan,
  onCanvasWheelZoom,
}: WorkflowReactFlowViewportProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const setWrapperRef = useCallback((element: HTMLDivElement | null) => {
    wrapperRef.current = element
    if (viewportRef) {
      viewportRef.current = element
    }
  }, [viewportRef])

  const viewport = useMemo<Viewport>(() => ({
    x: canvasOffset.x,
    y: canvasOffset.y,
    zoom,
  }), [canvasOffset.x, canvasOffset.y, zoom])

  const reactFlowNodes = useMemo<Node<WorkflowReactFlowNodeData>[]>(() => (
    nodes.map((node) => ({
      id: node.id,
      type: 'workflowNode',
      position: node.position,
      selected: selectedNodeIds.includes(node.id),
      draggable: false,
      selectable: false,
      data: {
        workflowNode: node,
        activePortId: activePortId && node.inputs.some((port) => port.id === activePortId) ? activePortId : null,
        onNodeClick,
        onNodeContextMenu,
        onPortClick,
        onPortPointerDown,
        onPortPointerUp,
        onPortPointerEnter,
        onPortPointerLeave,
      },
    }))
  ), [activePortId, nodes, onNodeClick, onNodeContextMenu, onPortClick, onPortPointerDown, onPortPointerEnter, onPortPointerLeave, onPortPointerUp, selectedNodeIds])

  const reactFlowEdges = useMemo<Edge<WorkflowReactFlowEdgeData>[]>(() => (
    edges.map((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.fromNodeId)
      const targetNode = nodes.find((node) => node.id === edge.toNodeId)

      return {
        id: edge.id,
        type: 'workflowEdge',
        source: edge.fromNodeId,
        target: edge.toNodeId,
        data: {
          disabled: Boolean(sourceNode && targetNode && (sourceNode.status === 'disabled' || targetNode.status === 'disabled')),
        },
      }
    })
  ), [edges, nodes])

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

    if (event.ctrlKey) {
      onCanvasWheelZoom?.(point, event.deltaY)
      return
    }

    if (event.shiftKey) {
      onCanvasPan?.({
        x: canvasOffset.x - event.deltaY,
        y: canvasOffset.y,
      })
      return
    }

    onCanvasPan?.({
      x: canvasOffset.x - event.deltaX,
      y: canvasOffset.y - event.deltaY,
    })
  }, [canvasOffset.x, canvasOffset.y, onCanvasPan, onCanvasWheelZoom])

  const handleNodeDragStop = useCallback((_event: ReactMouseEvent, node: Node<WorkflowReactFlowNodeData>) => {
    onNodesMove?.([node.id], {
      [node.id]: {
        x: node.position.x,
        y: node.position.y,
      },
    })
  }, [onNodesMove])

  const handleMove = useCallback((_event: MouseEvent | TouchEvent | null, nextViewport: Viewport) => {
    onCanvasPan?.({
      x: nextViewport.x,
      y: nextViewport.y,
    })
  }, [onCanvasPan])

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
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
        }}
      />
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={{ workflowNode: WorkflowReactFlowNode }}
        edgeTypes={{ workflowEdge: WorkflowReactFlowEdge }}
        fitView={false}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnDrag={[0]}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        viewport={viewport}
        onMove={handleMove}
        onNodeDragStop={handleNodeDragStop}
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
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <EdgeLayer
          edges={edges}
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          connectionDraft={connectionDraft}
        />
      </div>
    </div>
  )
}
