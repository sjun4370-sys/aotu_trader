import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import PaletteFloatingPanel from './PaletteFloatingPanel'
import type { PaletteDragPayload } from './PaletteFloatingPanel'
import WorkflowReactFlowViewport from './WorkflowReactFlowViewport'
import ZoomControls from './ZoomControls'
import NodeContextMenu from './NodeContextMenu'
import NodeInspector from './NodeInspector'
import {
  useWorkflowCanvas,
  type WorkflowViewportPoint
} from '../../hooks/useWorkflowCanvas'
import { useWorkflowConnectionDrag } from '../../hooks/useWorkflowConnectionDrag'
import { useWorkflowPortInteractions } from '../../hooks/useWorkflowPortInteractions'
import type { WorkflowViewportStateRef } from '../../hooks/useWorkflowConnectionDrag'
import type {
  WorkflowConnectionDraft,
  WorkflowConnectionTarget,
  WorkflowNode,
  WorkflowNodeStatus,
  WorkflowPortDirection
} from '../../types/workflow'
import {
  buildEdgeId,
  buildNodeId,
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_WIDTH,
  getCanvasPointFromClient,
  getPortPoint,
  snapToGrid,
} from '../../utils/workflow'
import styles from './WorkflowPage.module.css'

const CANVAS_GRID_SIZE = 12

interface ContextMenuState {
  nodeId: string
  left: number
  top: number
}

export default function WorkflowPage() {
  const pageRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const viewportStateRef = useRef<WorkflowViewportStateRef>({ x: 0, y: 0, zoom: 1 })
  const nodeCounterRef = useRef(0)
  const {
    nodes,
    setNodes,
    edges,
    setEdges,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    canvasOffset,
    setCanvasOffset,
    selectedNodeIds,
    setSelectedNodeIds,
    resetView
  } = useWorkflowCanvas()
  const [connectionDraft, setConnectionDraft] = useState<WorkflowConnectionDraft | null>(null)
  const [connectionTarget, setConnectionTarget] = useState<WorkflowConnectionTarget | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const connectionDraftRef = useRef<WorkflowConnectionDraft | null>(null)
  const connectionTargetRef = useRef<WorkflowConnectionTarget | null>(null)
  const pointerClientRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    connectionDraftRef.current = connectionDraft
  }, [connectionDraft])

  useEffect(() => {
    viewportStateRef.current = {
      x: canvasOffset.x,
      y: canvasOffset.y,
      zoom,
    }
  }, [canvasOffset.x, canvasOffset.y, zoom])

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

  const resolvePortPoint = useCallback((node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => (
    getPortPoint(node, portId, direction)
  ), [])

  const commitConnection = useCallback((draft: WorkflowConnectionDraft, target: WorkflowConnectionTarget) => {
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

  useWorkflowConnectionDrag({
    viewportRef,
    viewportStateRef,
    connectionDraft,
    connectionTarget,
    connectionTargetRef,
    pointerClientRef,
    nodes,
    setConnectionDraft,
    setConnectionTarget,
    commitConnection,
    getPortPoint: resolvePortPoint,
  })

  const createNode = useCallback((payload: PaletteDragPayload) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const rawX = payload.point.x - payload.grabOffset.x
    const rawY = payload.point.y - payload.grabOffset.y
    const viewportState = viewportStateRef.current

    const snappedPosition = snapToGrid(
      getCanvasPointFromClient(rawX, rawY, rect, viewportState),
      CANVAS_GRID_SIZE
    )

    nodeCounterRef.current += 1
    const newNode: WorkflowNode = {
      id: buildNodeId(payload.item.type, nodeCounterRef.current),
      type: payload.item.type,
      category: payload.item.category,
      label: payload.item.label,
      position: snappedPosition,
      size: { width: CANVAS_NODE_WIDTH, height: CANVAS_NODE_HEIGHT },
      inputs: payload.item.inputs,
      outputs: payload.item.outputs,
      config: {},
      status: 'enabled'
    }

    setNodes((previousNodes) => [...previousNodes, newNode])
    replaceSelection([newNode.id])
  }, [replaceSelection, setNodes])

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

  const clearTransientInteractionState = useCallback(() => {
    setConnectionDraft(null)
    connectionDraftRef.current = null
    setConnectionTarget(null)
    connectionTargetRef.current = null
  }, [setConnectionDraft, setConnectionTarget])

  const handleBackgroundClick = useCallback(() => {
    setSelectedNodeIds([])
    clearTransientInteractionState()
    setContextMenu(null)
  }, [clearTransientInteractionState, setSelectedNodeIds])

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((previousNodes) => previousNodes.filter((node) => node.id !== nodeId))
    setEdges((previousEdges) => previousEdges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
    ))
    setSelectedNodeIds((previousNodeIds) => previousNodeIds.filter((id) => id !== nodeId))
    setConnectionDraft((draft) => {
      const nextDraft = draft?.fromNodeId === nodeId ? null : draft
      connectionDraftRef.current = nextDraft
      return nextDraft
    })
    setConnectionTarget((target) => {
      const nextTarget = target?.nodeId === nodeId ? null : target
      connectionTargetRef.current = nextTarget
      return nextTarget
    })
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

  const {
    handlePortClick,
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerLeave,
  } = useWorkflowPortInteractions({
    viewportRef,
    viewportStateRef,
    connectionDraft,
    connectionDraftRef,
    connectionTargetRef,
    setConnectionDraft,
    setConnectionTarget,
    replaceSelection,
    commitConnection,
    getPortPoint: resolvePortPoint,
  })

  const handleViewportLiveChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    viewportStateRef.current = viewport
    if (viewport.zoom !== zoom) {
      setZoom(viewport.zoom)
    }
  }, [setZoom, zoom])

  const handleViewportCommit = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    viewportStateRef.current = viewport
    setCanvasOffset({ x: viewport.x, y: viewport.y })
    if (viewport.zoom !== zoom) {
      setZoom(viewport.zoom)
    }
  }, [setCanvasOffset, setZoom, zoom])

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
        clearTransientInteractionState()
        setContextMenu(null)
        setSelectedNodeIds([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearTransientInteractionState, nodes, replaceSelection, setSelectedNodeIds])

  return (
    <div ref={pageRef} data-testid="workflow-page" className={styles.page}>
      <PaletteFloatingPanel onDragEnd={createNode} />
      <div className={styles.canvasWrapper}>
        <WorkflowReactFlowViewport
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
          onPortClick={handlePortClick}
          onPortPointerDown={handlePortPointerDown}
          onPortPointerUp={handlePortPointerUp}
          onPortPointerEnter={handlePortPointerEnter}
          onPortPointerLeave={handlePortPointerLeave}
          activePortId={connectionTarget?.portId ?? null}
          onViewportLiveChange={handleViewportLiveChange}
          onViewportCommit={handleViewportCommit}
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
