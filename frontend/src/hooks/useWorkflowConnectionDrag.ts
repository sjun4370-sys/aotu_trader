import { useEffect } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type {
  WorkflowConnectionDraft,
  WorkflowConnectionTarget,
  WorkflowNode,
  WorkflowPortDirection,
} from '../types/workflow'

export interface WorkflowViewportStateRef {
  x: number
  y: number
  zoom: number
}

interface UseWorkflowConnectionDragParams {
  viewportRef: RefObject<HTMLElement | null>
  viewportStateRef: RefObject<WorkflowViewportStateRef>
  connectionDraft: WorkflowConnectionDraft | null
  connectionTarget: WorkflowConnectionTarget | null
  connectionTargetRef: RefObject<WorkflowConnectionTarget | null>
  pointerClientRef: RefObject<{ x: number; y: number } | null>
  nodes: WorkflowNode[]
  setConnectionDraft: Dispatch<SetStateAction<WorkflowConnectionDraft | null>>
  setConnectionTarget: Dispatch<SetStateAction<WorkflowConnectionTarget | null>>
  commitConnection: (draft: WorkflowConnectionDraft, target: WorkflowConnectionTarget) => void
  getPortPoint: (node: WorkflowNode, portId: string, direction: WorkflowPortDirection) => { x: number; y: number } | null
}

function resolveTargetFromPoint(clientX: number, clientY: number): WorkflowConnectionTarget | null {
  const hitElements = document.elementsFromPoint(clientX, clientY)

  for (const element of hitElements) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    const portElement = element.closest<HTMLElement>('[data-port-direction="input"][data-port-id]')
    const nodeElement = element.closest<HTMLElement>('[data-testid^="canvas-node-"]')
    const nodeTestId = nodeElement?.dataset.testid ?? nodeElement?.getAttribute('data-testid')

    if (portElement && nodeTestId?.startsWith('canvas-node-')) {
      return {
        nodeId: nodeTestId.replace('canvas-node-', ''),
        portId: portElement.dataset.portId ?? '',
      }
    }
  }

  return null
}

export function useWorkflowConnectionDrag({
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
  getPortPoint,
}: UseWorkflowConnectionDragParams) {
  useEffect(() => {
    if (!connectionDraft) {
      return
    }

    const buildDraftPointFromClient = (clientX: number, clientY: number) => {
      const viewport = viewportRef.current
      if (!viewport) {
        return null
      }

      const rect = viewport.getBoundingClientRect()
      const viewportState = viewportStateRef.current
      return {
        x: (clientX - rect.left - viewportState.x) / viewportState.zoom,
        y: (clientY - rect.top - viewportState.y) / viewportState.zoom,
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointerClientRef.current = { x: event.clientX, y: event.clientY }
      const point = buildDraftPointFromClient(event.clientX, event.clientY)
      if (!point) {
        return
      }

      const hoveredTarget = resolveTargetFromPoint(event.clientX, event.clientY)

      if (hoveredTarget) {
        connectionTargetRef.current = hoveredTarget
        setConnectionTarget(hoveredTarget)
        const targetNode = nodes.find((node) => node.id === hoveredTarget.nodeId)
        const targetPoint = targetNode ? getPortPoint(targetNode, hoveredTarget.portId, 'input') : null
        if (targetPoint) {
          setConnectionDraft((draft) => (draft ? { ...draft, point: targetPoint } : draft))
          return
        }
      } else {
        connectionTargetRef.current = null
        setConnectionTarget(null)
      }

      setConnectionDraft((draft) => (draft ? { ...draft, point } : draft))
    }

    const handlePointerUp = () => {
      setConnectionDraft((draft) => {
        let target = connectionTargetRef.current ?? connectionTarget

        if (!target && pointerClientRef.current) {
          target = resolveTargetFromPoint(pointerClientRef.current.x, pointerClientRef.current.y)
        }

        if (draft && target) {
          commitConnection(draft, target)
        }

        return null
      })

      setConnectionTarget(null)
      connectionTargetRef.current = null
      pointerClientRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [
    commitConnection,
    connectionDraft,
    connectionTarget,
    connectionTargetRef,
    getPortPoint,
    nodes,
    pointerClientRef,
    setConnectionDraft,
    setConnectionTarget,
    viewportRef,
    viewportStateRef,
  ])
}
