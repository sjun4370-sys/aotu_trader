import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import PaletteFloatingPanel from './PaletteFloatingPanel'
import type { PaletteDragPayload } from './PaletteFloatingPanel'
import CanvasViewport from './CanvasViewport'
import ZoomControls from './ZoomControls'
import NodeContextMenu from './NodeContextMenu'
import NodeInspector from './NodeInspector'
import {
  useWorkflowCanvas,
  WORKFLOW_CANVAS_ZOOM_STEP,
  type WorkflowViewportPoint
} from '../../hooks/useWorkflowCanvas'
import type {
  WorkflowConnectionDraft,
  WorkflowNode,
  WorkflowNodeStatus,
  WorkflowPort,
  WorkflowPortDirection
} from '../../types/workflow'
import { buildEdgeId, buildNodeId, CANVAS_NODE_WIDTH, snapToGrid } from '../../utils/workflow'
import styles from './WorkflowPage.module.css'

const NODE_HEIGHT = 120
const CANVAS_GRID_SIZE = 12

interface ConnectionTarget {
  nodeId: string
  portId: string
}

interface ContextMenuState {
  nodeId: string
  left: number
  top: number
}

export default function WorkflowPage() {
  const pageRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const nodeCounterRef = useRef(0)
  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    zoom,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    canvasOffset,
    setCanvasOffset,
    selectedNodeIds,
    setSelectedNodeIds,
    resetView
  } = useWorkflowCanvas()
  const [connectionDraft, setConnectionDraft] = useState<WorkflowConnectionDraft | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<ConnectionTarget | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const selectedNodes = useMemo(
    () => nodes.filter((node) => selectedNodeIds.includes(node.id)),
    [nodes, selectedNodeIds]
  )
  const inspectorNode = selectedNodes.length === 1 ? selectedNodes[0] : null
  const contextMenuNode = contextMenu
    ? nodes.find((node) => node.id === contextMenu.nodeId) ?? null
    : null

  const replaceSelection = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds)
    setContextMenu(null)
  }, [setSelectedNodeIds])

  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedNodeIds((previousNodeIds) => (
      previousNodeIds.includes(nodeId)
        ? previousNodeIds.filter((id) => id !== nodeId)
        : [...previousNodeIds, nodeId]
    ))
    setContextMenu(null)
  }, [setSelectedNodeIds])

  const getPortPoint = useCallback((node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => {
    const ports = direction === 'output' ? node.outputs : node.inputs
    const portIndex = ports.findIndex((port) => port.id === portId)
    if (portIndex === -1) {
      return null
    }

    return {
      x: direction === 'output' ? node.position.x + CANVAS_NODE_WIDTH : node.position.x,
      y: node.position.y + (NODE_HEIGHT / (ports.length + 1)) * (portIndex + 1)
    }
  }, [])

  const buildDraftPointFromClient = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    return {
      x: (clientX - rect.left - canvasOffset.x) / zoom,
      y: (clientY - rect.top - canvasOffset.y) / zoom
    }
  }, [canvasOffset.x, canvasOffset.y, zoom])

  const commitConnection = useCallback((draft: WorkflowConnectionDraft, target: ConnectionTarget) => {
    if (draft.fromNodeId === target.nodeId) {
      return
    }

    const nextEdgeId = buildEdgeId(draft.fromNodeId, draft.fromPortId, target.nodeId, target.portId)
    setEdges((previousEdges) => {
      const withoutDuplicate = previousEdges.filter((edge) => edge.id !== nextEdgeId)
      return [
        ...withoutDuplicate,
        {
          id: nextEdgeId,
          fromNodeId: draft.fromNodeId,
          fromPortId: draft.fromPortId,
          toNodeId: target.nodeId,
          toPortId: target.portId
        }
      ]
    })
    replaceSelection([target.nodeId])
  }, [replaceSelection, setEdges])

  useEffect(() => {
    if (!connectionDraft) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const point = buildDraftPointFromClient(event.clientX, event.clientY)
      if (point) {
        setConnectionDraft((draft) => draft ? { ...draft, point } : draft)
      }
    }

    const handlePointerUp = () => {
      setConnectionDraft((draft) => {
        if (draft && connectionTarget) {
          commitConnection(draft, connectionTarget)
        }
        return null
      })
      setConnectionTarget(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [buildDraftPointFromClient, commitConnection, connectionDraft, connectionTarget])

  const createNode = useCallback((payload: PaletteDragPayload) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const rawX = payload.point.x - payload.grabOffset.x - rect.left
    const rawY = payload.point.y - payload.grabOffset.y - rect.top

    const snappedPosition = snapToGrid(
      {
        x: (rawX - canvasOffset.x) / zoom,
        y: (rawY - canvasOffset.y) / zoom
      },
      CANVAS_GRID_SIZE
    )

    nodeCounterRef.current += 1
    const newNode: WorkflowNode = {
      id: buildNodeId(payload.item.type, nodeCounterRef.current),
      type: payload.item.type,
      category: payload.item.category,
      label: payload.item.label,
      position: snappedPosition,
      size: { width: CANVAS_NODE_WIDTH, height: NODE_HEIGHT },
      inputs: payload.item.inputs,
      outputs: payload.item.outputs,
      config: {},
      status: 'enabled'
    }

    setNodes((previousNodes) => [...previousNodes, newNode])
    replaceSelection([newNode.id])
  }, [canvasOffset.x, canvasOffset.y, replaceSelection, setNodes, zoom])

  const handleNodeClick = useCallback((nodeId: string, additive: boolean) => {
    if (additive) {
      toggleSelection(nodeId)
      return
    }
    replaceSelection([nodeId])
  }, [replaceSelection, toggleSelection])

  const handleNodeContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, node: WorkflowNode) => {
    const page = pageRef.current
    if (!page) {
      return
    }

    const rect = page.getBoundingClientRect()
    if (!selectedNodeIds.includes(node.id)) {
      replaceSelection([node.id])
    }
    setContextMenu({
      nodeId: node.id,
      left: event.clientX - rect.left + 8,
      top: event.clientY - rect.top + 8
    })
  }, [replaceSelection, selectedNodeIds])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeIds([])
    setConnectionDraft(null)
    setConnectionTarget(null)
    setContextMenu(null)
  }, [setSelectedNodeIds])

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((previousNodes) => previousNodes.filter((node) => node.id !== nodeId))
    setEdges((previousEdges) => previousEdges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
    ))
    setSelectedNodeIds((previousNodeIds) => previousNodeIds.filter((id) => id !== nodeId))
    setConnectionDraft((draft) => draft?.fromNodeId === nodeId ? null : draft)
    setConnectionTarget((target) => target?.nodeId === nodeId ? null : target)
    setContextMenu((menu) => menu?.nodeId === nodeId ? null : menu)
  }, [setEdges, setNodes, setSelectedNodeIds])

  const handleToggleNodeStatus = useCallback((nodeId: string) => {
    setNodes((previousNodes) => previousNodes.map((node) => (
      node.id === nodeId
        ? { ...node, status: node.status === 'enabled' ? 'disabled' : 'enabled' }
        : node
    )))
    setContextMenu(null)
  }, [setNodes])

  const handleApplyConfig = useCallback((nodeId: string, payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => {
    setNodes((previousNodes) => previousNodes.map((node) => (
      node.id === nodeId
        ? { ...node, config: payload.config, status: payload.status }
        : node
    )))
  }, [setNodes])

  const handleNodesMove = useCallback((nodeIds: string[], updates: Record<string, WorkflowViewportPoint>) => {
    setNodes((previousNodes) => previousNodes.map((node) => {
      if (!nodeIds.includes(node.id)) {
        return node
      }

      return {
        ...node,
        position: snapToGrid(updates[node.id], CANVAS_GRID_SIZE)
      }
    }))
  }, [setNodes])

  const handleSelectionBoxComplete = useCallback((nodeIds: string[], additive: boolean) => {
    if (additive) {
      setSelectedNodeIds((previousNodeIds) => Array.from(new Set([...previousNodeIds, ...nodeIds])))
      setContextMenu(null)
      return
    }

    replaceSelection(nodeIds)
  }, [replaceSelection, setSelectedNodeIds])

  const handlePortClick = useCallback((node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => {
    if (connectionDraft && direction === 'input') {
      commitConnection(connectionDraft, { nodeId: node.id, portId })
      setConnectionDraft(null)
      setConnectionTarget(null)
      return
    }

    if (direction === 'output') {
      const startPoint = getPortPoint(node, portId, 'output')
      if (!startPoint || node.status === 'disabled') {
        return
      }

      setConnectionDraft({
        fromNodeId: node.id,
        fromPortId: portId,
        point: startPoint
      })
      replaceSelection([node.id])
      return
    }

    if (connectionDraft) {
      setConnectionTarget({ nodeId: node.id, portId })
    }
  }, [commitConnection, connectionDraft, getPortPoint, replaceSelection])

  const handlePortPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => {
    if (port.direction !== 'output' || node.status === 'disabled') {
      return
    }

    event.preventDefault()
    const pointerPoint = buildDraftPointFromClient(event.clientX, event.clientY)
    if (!pointerPoint) {
      return
    }

    setConnectionDraft({
      fromNodeId: node.id,
      fromPortId: port.id,
      point: pointerPoint
    })
    setConnectionTarget(null)
    replaceSelection([node.id])
  }, [buildDraftPointFromClient, replaceSelection])

  const handlePortPointerEnter = useCallback((node: WorkflowNode, port: WorkflowPort) => {
    if (!connectionDraft || port.direction !== 'input' || connectionDraft.fromNodeId === node.id) {
      return
    }

    setConnectionTarget({ nodeId: node.id, portId: port.id })
    const targetPoint = getPortPoint(node, port.id, 'input')
    if (targetPoint) {
      setConnectionDraft((draft) => draft ? { ...draft, point: targetPoint } : draft)
    }
  }, [connectionDraft, getPortPoint])

  const handlePortPointerLeave = useCallback((node: WorkflowNode, port: WorkflowPort) => {
    setConnectionTarget((currentTarget) => {
      if (!currentTarget) {
        return currentTarget
      }
      return currentTarget.nodeId === node.id && currentTarget.portId === port.id ? null : currentTarget
    })
  }, [])

  const handleCanvasWheelZoom = useCallback((point: WorkflowViewportPoint, deltaY: number) => {
    const nextZoom = deltaY < 0 ? zoom + WORKFLOW_CANVAS_ZOOM_STEP : zoom - WORKFLOW_CANVAS_ZOOM_STEP
    zoomAtPoint(nextZoom, point)
  }, [zoom, zoomAtPoint])

  const handleCanvasPointerMove = useCallback((point: WorkflowViewportPoint) => {
    setConnectionDraft((draft) => draft ? { ...draft, point } : draft)
  }, [])

  const handleResetView = useCallback(() => {
    resetView()
    setSelectedNodeIds([])
    setContextMenu(null)
  }, [resetView, setSelectedNodeIds])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        replaceSelection(nodes.map((node) => node.id))
        return
      }

      if (event.key === 'Escape') {
        setConnectionDraft(null)
        setConnectionTarget(null)
        setContextMenu(null)
        setSelectedNodeIds([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nodes, replaceSelection, setSelectedNodeIds])

  return (
    <div ref={pageRef} data-testid="workflow-page" className={styles.page}>
      <PaletteFloatingPanel onDragEnd={createNode} />
      <div className={styles.canvasWrapper}>
        <CanvasViewport
          zoom={zoom}
          canvasOffset={canvasOffset}
          nodes={nodes}
          edges={edges}
          selectedNodeIds={selectedNodeIds}
          connectionDraft={connectionDraft}
          className={styles.canvas}
          viewportRef={viewportRef}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onBackgroundClick={handleBackgroundClick}
          onNodesMove={handleNodesMove}
          onSelectionBoxComplete={handleSelectionBoxComplete}
          onPortClick={handlePortClick}
          onPortPointerDown={handlePortPointerDown}
          onPortPointerEnter={handlePortPointerEnter}
          onPortPointerLeave={handlePortPointerLeave}
          activePortId={connectionTarget?.portId ?? null}
          onCanvasPointerMove={handleCanvasPointerMove}
          onCanvasPan={setCanvasOffset}
          onCanvasWheelZoom={handleCanvasWheelZoom}
        />
        {contextMenu && contextMenuNode ? (
          <NodeContextMenu
            left={contextMenu.left}
            top={contextMenu.top}
            status={contextMenuNode.status}
            onClose={() => setContextMenu(null)}
            onToggleStatus={() => handleToggleNodeStatus(contextMenuNode.id)}
            onDelete={() => handleDeleteNode(contextMenuNode.id)}
          />
        ) : null}
      </div>
      <section
        data-testid="node-inspector"
        className={[styles.inspector, !inspectorNode ? styles.inspectorHidden : null].filter(Boolean).join(' ')}
      >
        <NodeInspector
          node={inspectorNode}
          onClose={() => setSelectedNodeIds([])}
          onDelete={inspectorNode ? () => handleDeleteNode(inspectorNode.id) : undefined}
          onApply={inspectorNode ? (payload) => handleApplyConfig(inspectorNode.id, payload) : undefined}
        />
      </section>
      <ZoomControls
        className={styles.zoomControls}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={handleResetView}
      />
    </div>
  )
}
