import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Play } from 'lucide-react'
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
import type { WorkflowExecutionStatus, NodeExecutionResult } from '../../types/workflowExecution'
import {
  buildEdgeId,
  buildNodeId,
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_WIDTH,
  getCanvasPointFromClient,
  getPortPoint,
  snapToGrid,
} from '../../utils/workflow'
import { CANVAS_GRID_SIZE } from '../../constants'
import { createWorkflow, updateWorkflow, getWorkflow, runWorkflow as runWorkflowAPI } from '../../services/workflow'
import styles from './WorkflowPage.module.css'

interface ContextMenuState {
  nodeId: string
  left: number
  top: number
}

export default function WorkflowPage() {
  const navigate = useNavigate()
  const { id: workflowId } = useParams<{ id: string }>()
  const isNewWorkflow = workflowId === 'new' || !workflowId
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
  const [executionState, setExecutionState] = useState<WorkflowExecutionStatus>('idle')
  // TODO: Task 12 - integrate runningNodeId into UI for visual feedback
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null)
  // TODO: Task 12 - integrate nodeResults into UI to show execution results
  const [nodeResults, setNodeResults] = useState<Map<string, NodeExecutionResult>>(new Map())
  const [activeEdgeIds, setActiveEdgeIds] = useState<Set<string>>(new Set())
  const connectionDraftRef = useRef<WorkflowConnectionDraft | null>(null)
  const connectionTargetRef = useRef<WorkflowConnectionTarget | null>(null)
  const pointerClientRef = useRef<{ x: number; y: number } | null>(null)

  // 工作流基本信息
  const [workflowName, setWorkflowName] = useState('未命名工作流')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  // 导入 Modal
  const [showImportModal, setShowImportModal] = useState(false)
  const [importTab, setImportTab] = useState<'file' | 'paste'>('paste')
  const [importPasteContent, setImportPasteContent] = useState('')
  const [importFileName, setImportFileName] = useState('')

  // 导出 Modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportCopySuccess, setExportCopySuccess] = useState(false)

  // 离开确认
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '有未保存的更改，确定要离开吗？'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // 监听变化标记为未保存
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true)
    }
  }, [nodes, edges])

  // 加载工作流数据（编辑时）
  useEffect(() => {
    if (isNewWorkflow) {
      return
    }

    const loadWorkflowData = async () => {
      try {
        const workflow = await getWorkflow(workflowId!)
        setWorkflowName(workflow.name)
        setNodes(workflow.nodes || [])
        setEdges(workflow.edges || [])
        setHasUnsavedChanges(false)
      } catch (error) {
        setSaveError('加载工作流失败')
      }
    }

    loadWorkflowData()
  }, [workflowId, isNewWorkflow])

  // 保存工作流
  const handleSave = useCallback(async () => {
    if (!workflowName.trim()) {
      setSaveError('请输入工作流名称')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const workflowData = {
        name: workflowName,
        nodes,
        edges,
      }

      let savedWorkflow
      if (isNewWorkflow) {
        savedWorkflow = await createWorkflow(workflowData)
        // 新建保存成功后跳转到编辑页面
        navigate(`/workflow/${savedWorkflow.id}`, { replace: true })
      } else {
        savedWorkflow = await updateWorkflow(workflowId!, workflowData)
      }

      setHasUnsavedChanges(false)
      // 可以在这里添加保存成功提示
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }, [workflowName, nodes, edges, isNewWorkflow, workflowId, navigate])

  // 返回列表
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要离开吗？')
      if (!confirmed) return
    }
    navigate('/')
  }, [hasUnsavedChanges, navigate])

  // 导出JSON
  const getExportJSON = useCallback(() => {
    return JSON.stringify({
      version: "1.0.0",
      exported_at: new Date().toISOString(),
      workflow: {
        name: workflowName,
        nodes,
        edges,
      },
    }, null, 2)
  }, [workflowName, nodes, edges])

  const handleExportJSON = useCallback(() => {
    setShowExportModal(true)
    setExportCopySuccess(false)
  }, [])

  const handleCopyJSON = useCallback(() => {
    const json = getExportJSON()
    navigator.clipboard.writeText(json).then(() => {
      setExportCopySuccess(true)
      setTimeout(() => setExportCopySuccess(false), 2000)
    })
  }, [getExportJSON])

  const handleDownloadJSON = useCallback(() => {
    const json = getExportJSON()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${workflowName || "workflow"}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [getExportJSON, workflowName])

  // 导入JSON
  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const importedNodes = json?.workflow?.nodes
        const importedEdges = json?.workflow?.edges
        const importedName = json?.workflow?.name

        if (!Array.isArray(importedNodes) || !Array.isArray(importedEdges)) {
          alert("导入失败：JSON 格式不正确，缺少 nodes 或 edges")
          return
        }

        // 兼容旧类型名称映射
        const mappedNodes = importedNodes.map((node: any) => ({
          ...node,
          type: node.type === "market" ? "okx_ticker" :
                node.type === "account" ? "okx_account" :
                node.type === "indicator" ? "rsi" :
                node.type === "analysis" ? "llm_analysis" :
                node.type === "trade" ? "create_order" :
                node.type === "currency" ? "okx_ticker" : node.type,
          status: node.status || "enabled",
        }))

        setNodes(mappedNodes)
        setEdges(importedEdges)
        if (importedName) {
          setWorkflowName(importedName)
        }
        setHasUnsavedChanges(true)
        setSelectedNodeIds([])
        setShowImportModal(false)
      } catch (err) {
        alert("导入失败：无法解析 JSON 文件")
        console.error(err)
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        if (importFileInputRef.current) {
          importFileInputRef.current.value = ""
        }
      }
    }
    reader.readAsText(file)
  }, [setNodes, setEdges, setSelectedNodeIds])

  const handleImportConfirm = useCallback(() => {
    if (importTab === 'paste') {
      if (!importPasteContent.trim()) {
        alert("请粘贴 JSON 内容")
        return
      }
      try {
        const json = JSON.parse(importPasteContent)
        const importedNodes = json?.workflow?.nodes
        const importedEdges = json?.workflow?.edges
        const importedName = json?.workflow?.name

        if (!Array.isArray(importedNodes) || !Array.isArray(importedEdges)) {
          alert("导入失败：JSON 格式不正确，缺少 nodes 或 edges")
          return
        }

        const mappedNodes = importedNodes.map((node: any) => ({
          ...node,
          type: node.type === "market" ? "okx_ticker" :
                node.type === "account" ? "okx_account" :
                node.type === "indicator" ? "rsi" :
                node.type === "analysis" ? "llm_analysis" :
                node.type === "trade" ? "create_order" :
                node.type === "currency" ? "okx_ticker" : node.type,
          status: node.status || "enabled",
        }))

        setNodes(mappedNodes)
        setEdges(importedEdges)
        if (importedName) {
          setWorkflowName(importedName)
        }
        setHasUnsavedChanges(true)
        setSelectedNodeIds([])
        setShowImportModal(false)
        setImportPasteContent('')
      } catch (err) {
        alert("导入失败：JSON 格式错误，请检查内容")
        console.error(err)
      }
    } else {
      // 文件模式：触发文件选择
      importFileInputRef.current?.click()
    }
  }, [importTab, importPasteContent, setNodes, setEdges, setSelectedNodeIds, setWorkflowName])

  const handleImportFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const importedNodes = json?.workflow?.nodes
        const importedEdges = json?.workflow?.edges
        const importedName = json?.workflow?.name

        if (!Array.isArray(importedNodes) || !Array.isArray(importedEdges)) {
          alert("导入失败：JSON 格式不正确，缺少 nodes 或 edges")
          return
        }

        const mappedNodes = importedNodes.map((node: any) => ({
          ...node,
          type: node.type === "market" ? "okx_ticker" :
                node.type === "account" ? "okx_account" :
                node.type === "indicator" ? "rsi" :
                node.type === "analysis" ? "llm_analysis" :
                node.type === "trade" ? "create_order" :
                node.type === "currency" ? "okx_ticker" : node.type,
          status: node.status || "enabled",
        }))

        setNodes(mappedNodes)
        setEdges(importedEdges)
        if (importedName) {
          setWorkflowName(importedName)
        }
        setHasUnsavedChanges(true)
        setSelectedNodeIds([])
        setShowImportModal(false)
        setImportPasteContent('')
        setImportFileName('')
      } catch (err) {
        alert("导入失败：无法解析 JSON 文件")
        console.error(err)
      } finally {
        if (importFileInputRef.current) {
          importFileInputRef.current.value = ""
        }
      }
    }
    reader.readAsText(file)
  }, [setNodes, setEdges, setSelectedNodeIds, setWorkflowName])

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
      const existingFromSameSource = previousEdges.some(
        (edge) => edge.fromNodeId === draft.fromNodeId && edge.toNodeId === target.nodeId
      )
      if (existingFromSameSource) {
        return previousEdges
      }

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
    const nodeId = buildNodeId(payload.item.type, nodeCounterRef.current)
    const newNode: WorkflowNode = {
      id: nodeId,
      type: payload.item.type,
      customName: `${payload.item.label}_${nodeCounterRef.current}`,
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

  const handleRunWorkflow = useCallback(async () => {
    if (!workflowId || workflowId === 'new') {
      return
    }

    setExecutionState('idle')
    setNodeResults(new Map())
    setRunningNodeId(null)
    setActiveEdgeIds(new Set())
    setExecutionState('running')

    try {
      // 调用后端真实 API
      const response = await runWorkflowAPI(workflowId)

      // 将结果转换并显示
      if (response.results) {
        for (const result of response.results) {
          setNodeResults(prev => new Map(prev).set(result.node_id, {
            nodeId: result.node_id,
            customName: result.node_id,
            status: result.status === 'completed' ? 'success' : 'error',
            output: result.output,
            error: result.error,
            startTime: result.start_time ? new Date(result.start_time).getTime() : undefined,
            endTime: result.end_time ? new Date(result.end_time).getTime() : undefined
          }))
          setRunningNodeId(null)
        }
      }
      setExecutionState('completed')
    } catch (error) {
      setExecutionState('error')
      console.error('[Workflow] 执行失败:', error)
    }
  }, [workflowId])

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
      <div className={styles.sidebar}>
        <PaletteFloatingPanel onDragEnd={createNode} />
      </div>

      {/* 顶部工具栏 */}
      <div className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.iconButton}
            onClick={handleBack}
            title="返回列表"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            type="text"
            className={styles.workflowNameInput}
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="输入工作流名称"
          />
          {hasUnsavedChanges && (
            <span className={styles.unsavedIndicator}>未保存</span>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportFileChange}
          />
          <input
            ref={importFileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportJSON}
          />
          {saveError && (
            <span className={styles.saveError}>{saveError}</span>
          )}
          <button
            className={styles.saveButton}
            onClick={() => { setImportTab('paste'); setImportPasteContent(''); setImportFileName(''); setShowImportModal(true) }}
            title="导入JSON"
          >
            导入
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button
            className={styles.runButton}
            onClick={handleRunWorkflow}
            disabled={executionState === 'running'}
          >
            <Play size={16} />
            {executionState === 'running' ? '运行中...' : '运行'}
          </button>
          <button
            className={styles.runButton}
            onClick={handleExportJSON}
            title="导出JSON"
          >
            导出
          </button>
        </div>
      </div>

      {/* 旧工具栏位置 - 保持为空或移除 */}
      <div className={styles.canvasWrapper}>
        <WorkflowReactFlowViewport
          zoom={zoom}
          canvasOffset={canvasOffset}
          nodes={nodes}
          edges={edges}
          selectedNodeIds={selectedNodeIds}
          connectionDraft={connectionDraft}
          activeEdgeIds={activeEdgeIds}
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
          nodes={nodes}
          edges={edges}
          nodeResults={nodeResults}
          runningNodeId={runningNodeId}
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

      {/* 导入 Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>导入工作流</span>
              <button className={styles.modalClose} onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.importTabs}>
                <button
                  className={[styles.importTab, importTab === 'paste' ? styles.active : ''].filter(Boolean).join(' ')}
                  onClick={() => setImportTab('paste')}
                >
                  粘贴 JSON
                </button>
                <button
                  className={[styles.importTab, importTab === 'file' ? styles.active : ''].filter(Boolean).join(' ')}
                  onClick={() => setImportTab('file')}
                >
                  从文件导入
                </button>
              </div>
              {importTab === 'paste' ? (
                <textarea
                  className={styles.importTextarea}
                  value={importPasteContent}
                  onChange={(e) => setImportPasteContent(e.target.value)}
                  placeholder={'请粘贴工作流 JSON 内容，例如：\n{\n  "version": "1.0.0",\n  "workflow": {\n    "name": "我的工作流",\n    "nodes": [...],\n    "edges": [...]\n  }\n}'}
                  spellCheck={false}
                />
              ) : (
                <div
                  className={styles.importFileZone}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={styles.importFileText}>
                    {importFileName || '点击选择 JSON 文件'}
                  </span>
                  <span className={styles.importFileHint}>
                    支持 .json 文件
                  </span>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.saveButton}
                onClick={() => setShowImportModal(false)}
              >
                取消
              </button>
              <button
                className={styles.runButton}
                onClick={handleImportConfirm}
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出 Modal */}
      {showExportModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>导出工作流</span>
              <button className={styles.modalClose} onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <textarea
                className={styles.exportJsonPreview}
                value={getExportJSON()}
                readOnly
                spellCheck={false}
              />
            </div>
            <div className={styles.modalFooter}>
              {exportCopySuccess && (
                <span className={styles.copySuccess}>已复制到剪贴板</span>
              )}
              <button
                className={styles.saveButton}
                onClick={handleCopyJSON}
              >
                复制 JSON
              </button>
              <button
                className={styles.runButton}
                onClick={handleDownloadJSON}
              >
                下载文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
