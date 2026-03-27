import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  WorkflowConnectionDraft,
  WorkflowConnectionTarget,
  WorkflowNode,
  WorkflowPort,
  WorkflowPortDirection,
} from '../types/workflow'
import type { WorkflowViewportStateRef } from './useWorkflowConnectionDrag'

interface UseWorkflowPortInteractionsParams {
  viewportRef: MutableRefObject<HTMLElement | null>
  viewportStateRef: MutableRefObject<WorkflowViewportStateRef>
  connectionDraft: WorkflowConnectionDraft | null
  connectionDraftRef: MutableRefObject<WorkflowConnectionDraft | null>
  connectionTargetRef: MutableRefObject<WorkflowConnectionTarget | null>
  setConnectionDraft: Dispatch<SetStateAction<WorkflowConnectionDraft | null>>
  setConnectionTarget: Dispatch<SetStateAction<WorkflowConnectionTarget | null>>
  replaceSelection: (nodeIds: string[]) => void
  commitConnection: (draft: WorkflowConnectionDraft, target: WorkflowConnectionTarget) => void
  getPortPoint: (node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => { x: number; y: number } | null
}

export function useWorkflowPortInteractions({
  viewportRef,
  viewportStateRef,
  connectionDraft,
  connectionDraftRef,
  connectionTargetRef,
  setConnectionDraft,
  setConnectionTarget,
  replaceSelection,
  commitConnection,
  getPortPoint,
}: UseWorkflowPortInteractionsParams) {
  const handlePortClick = useCallback((node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => {
    const activeDraft = connectionDraftRef.current ?? connectionDraft

    if (activeDraft && direction === 'input') {
      commitConnection(activeDraft, { nodeId: node.id, portId })
      setConnectionDraft(null)
      connectionDraftRef.current = null
      setConnectionTarget(null)
      connectionTargetRef.current = null
      return
    }

    if (direction === 'output') {
      const startPoint = getPortPoint(node, portId, 'output')
      if (!startPoint || node.status === 'disabled') {
        return
      }

      const nextDraft = {
        fromNodeId: node.id,
        fromPortId: portId,
        point: startPoint,
      }
      setConnectionDraft(nextDraft)
      connectionDraftRef.current = nextDraft
      replaceSelection([node.id])
      return
    }

    if (activeDraft) {
      setConnectionTarget({ nodeId: node.id, portId })
    }
  }, [commitConnection, connectionDraft, connectionDraftRef, connectionTargetRef, getPortPoint, replaceSelection, setConnectionDraft, setConnectionTarget])

  const handlePortPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => {
    if (port.direction !== 'output' || node.status === 'disabled') {
      return
    }

    event.preventDefault()
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const viewportState = viewportStateRef.current
    const nextDraft = {
      fromNodeId: node.id,
      fromPortId: port.id,
      point: {
        x: (event.clientX - rect.left - viewportState.x) / viewportState.zoom,
        y: (event.clientY - rect.top - viewportState.y) / viewportState.zoom,
      },
    }

    setConnectionDraft(nextDraft)
    connectionDraftRef.current = nextDraft
    setConnectionTarget(null)
    replaceSelection([node.id])
  }, [connectionDraftRef, replaceSelection, setConnectionDraft, setConnectionTarget, viewportRef, viewportStateRef])

  const handlePortPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => {
    const activeDraft = connectionDraftRef.current ?? connectionDraft
    if (!activeDraft || port.direction !== 'input' || activeDraft.fromNodeId === node.id) {
      return
    }

    event.preventDefault()
    commitConnection(activeDraft, { nodeId: node.id, portId: port.id })
    setConnectionDraft(null)
    connectionDraftRef.current = null
    setConnectionTarget(null)
    connectionTargetRef.current = null
  }, [commitConnection, connectionDraft, connectionDraftRef, connectionTargetRef, setConnectionDraft, setConnectionTarget])

  const handlePortPointerEnter = useCallback((node: WorkflowNode, port: WorkflowPort) => {
    const activeDraft = connectionDraftRef.current ?? connectionDraft
    if (!activeDraft || port.direction !== 'input' || activeDraft.fromNodeId === node.id) {
      return
    }

    const nextTarget = { nodeId: node.id, portId: port.id }
    setConnectionTarget(nextTarget)
    connectionTargetRef.current = nextTarget
    const targetPoint = getPortPoint(node, port.id, 'input')
    if (targetPoint) {
      commitConnection({ ...activeDraft, point: targetPoint }, nextTarget)
      setConnectionDraft(null)
      connectionDraftRef.current = null
      setConnectionTarget(null)
      connectionTargetRef.current = null
    }
  }, [commitConnection, connectionDraft, connectionDraftRef, connectionTargetRef, getPortPoint, setConnectionDraft, setConnectionTarget])

  const handlePortPointerLeave = useCallback((node: WorkflowNode, port: WorkflowPort) => {
    setConnectionTarget((currentTarget) => {
      if (!currentTarget) {
        return currentTarget
      }
      if (currentTarget.nodeId === node.id && currentTarget.portId === port.id) {
        connectionTargetRef.current = null
        return null
      }
      return currentTarget
    })
  }, [connectionTargetRef, setConnectionTarget])

  return {
    handlePortClick,
    handlePortPointerDown,
    handlePortPointerUp,
    handlePortPointerEnter,
    handlePortPointerLeave,
  }
}
