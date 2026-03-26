import { useMemo, useState } from 'react'
import type { WorkflowConnectionDraft, WorkflowEdge, WorkflowNode, WorkflowNodeCategory } from '../../types/workflow'
import { CANVAS_NODE_WIDTH } from '../../utils/workflow'
import styles from './EdgeLayer.module.css'

const CATEGORY_COLORS: Record<WorkflowNodeCategory, string> = {
  currency: '#0ea5a9',
  data: '#38bdf8',
  strategy: '#a855f7',
  ai: '#fb7185',
  tool: '#f59e0b'
}

const NODE_WIDTH = CANVAS_NODE_WIDTH
const NODE_HEIGHT = 120

interface EdgeLayerProps {
  edges: WorkflowEdge[]
  nodes: WorkflowNode[]
  selectedNodeIds: string[]
  connectionDraft?: WorkflowConnectionDraft | null
  draggingNodeIds?: string[]
}

interface PortPosition {
  x: number
  y: number
}

function getPortPosition(
  node: WorkflowNode,
  portId: string,
  direction: 'input' | 'output'
): PortPosition | null {
  const ports = direction === 'input' ? node.inputs : node.outputs
  const portIndex = ports.findIndex((port) => port.id === portId)
  if (portIndex === -1) {
    return null
  }

  const gap = NODE_HEIGHT / (ports.length + 1)
  return {
    x: direction === 'input' ? node.position.x : node.position.x + NODE_WIDTH,
    y: node.position.y + gap * (portIndex + 1)
  }
}

function buildBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const distance = Math.abs(x2 - x1)
  const curve = Math.max(72, Math.min(160, distance * 0.45))
  return `M ${x1} ${y1} C ${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`
}

interface ResolvedEdgePath {
  edge: WorkflowEdge | null
  id: string
  pathD: string
  fromColor: string
  toColor: string
  isConnectedToSelection: boolean
  isDisabled: boolean
}

function EdgePath({
  edge,
  selectedNodeIds,
  path,
  dragging = false,
  preview = false
}: {
  edge: WorkflowEdge | null
  selectedNodeIds: string[]
  path: ResolvedEdgePath
  dragging?: boolean
  preview?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  let visualState: 'default' | 'active' | 'dimmed' = 'default'
  if (!preview && selectedNodeIds.length > 0) {
    visualState = path.isConnectedToSelection ? 'active' : 'dimmed'
  }

  const gradientId = `edge-gradient-${path.id}`

  let strokeWidth = preview ? 3.25 : 2.5
  let opacity = preview ? 0.95 : 1
  let filter: string | undefined
  let pathClassName = styles.path

  if (dragging) {
    strokeWidth = preview ? 3 : 2.2
    opacity = preview ? 0.82 : (path.isDisabled ? 0.34 : 0.72)
    filter = undefined
    pathClassName = styles.pathDragging
  } else if (path.isDisabled) {
    strokeWidth = hovered ? 3.4 : 2.6
    opacity = hovered ? 0.86 : 0.42
    filter = hovered ? 'drop-shadow(0 0 6px rgba(148, 163, 184, 0.55))' : undefined
    pathClassName = hovered ? `${styles.path} ${styles.pathHovered}` : styles.path
  } else if (visualState === 'dimmed') {
    opacity = 0.22
  } else if (visualState === 'active') {
    strokeWidth = 3.5
    filter = `drop-shadow(0 0 6px ${path.fromColor}) drop-shadow(0 0 10px ${path.toColor})`
    pathClassName = `${styles.path} ${styles.pathActive}`
  } else if (hovered) {
    strokeWidth = 4
    opacity = 1
    filter = `drop-shadow(0 0 6px ${path.fromColor}) drop-shadow(0 0 14px ${path.toColor})`
    pathClassName = `${styles.path} ${styles.pathHovered}`
  }

  if (preview) {
    pathClassName = `${styles.path} ${styles.pathActive}`
    filter = `drop-shadow(0 0 6px ${path.fromColor})`
    opacity = 0.9
  }

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={path.fromColor} />
          <stop offset="100%" stopColor={path.toColor} />
        </linearGradient>
      </defs>
      {!preview ? (
        <path
          d={path.pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ pointerEvents: 'stroke', cursor: edge ? 'pointer' : 'default' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      ) : null}
      <path
        data-testid={preview ? 'workflow-edge-preview' : `workflow-edge-${path.id}`}
        data-edge-disabled={path.isDisabled ? 'true' : 'false'}
        d={path.pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{ filter, pointerEvents: 'none' }}
        className={pathClassName}
      />
    </g>
  )
}

export default function EdgeLayer({
  edges,
  nodes,
  selectedNodeIds,
  connectionDraft = null,
  draggingNodeIds = []
}: EdgeLayerProps) {
  const isDragging = draggingNodeIds.length > 0
  const resolvedPaths = useMemo(() => {
    return edges.flatMap((edge) => {
      const fromNode = nodes.find((node) => node.id === edge.fromNodeId)
      const toNode = nodes.find((node) => node.id === edge.toNodeId)

      if (!fromNode || !toNode) {
        return []
      }

      const startPos = getPortPosition(fromNode, edge.fromPortId, 'output')
      const endPos = getPortPosition(toNode, edge.toPortId, 'input')
      if (!startPos || !endPos) {
        return []
      }

      const isDisabled = fromNode.status === 'disabled' || toNode.status === 'disabled'

      return [{
        edge,
        id: edge.id,
        pathD: buildBezierPath(startPos.x, startPos.y, endPos.x, endPos.y),
        fromColor: isDisabled ? '#94a3b8' : CATEGORY_COLORS[fromNode.category],
        toColor: isDisabled ? '#cbd5e1' : CATEGORY_COLORS[toNode.category],
        isConnectedToSelection:
          selectedNodeIds.includes(edge.fromNodeId) || selectedNodeIds.includes(edge.toNodeId),
        isDisabled
      } satisfies ResolvedEdgePath]
    })
  }, [edges, nodes, selectedNodeIds])

  const draftPath = useMemo(() => {
    if (!connectionDraft) {
      return null
    }

    const fromNode = nodes.find((node) => node.id === connectionDraft.fromNodeId)
    if (!fromNode) {
      return null
    }

    const startPos = getPortPosition(fromNode, connectionDraft.fromPortId, 'output')
    if (!startPos) {
      return null
    }

    const fromColor = CATEGORY_COLORS[fromNode.category]

    return {
      edge: null,
      id: `draft-${connectionDraft.fromNodeId}-${connectionDraft.fromPortId}`,
      pathD: buildBezierPath(startPos.x, startPos.y, connectionDraft.point.x, connectionDraft.point.y),
      fromColor,
      toColor: fromColor,
      isConnectedToSelection: true,
      isDisabled: false
    } satisfies ResolvedEdgePath
  }, [connectionDraft, nodes])

  return (
    <svg className={styles.svg} aria-hidden="true" data-testid="edge-layer">
      {resolvedPaths.map((path) => (
        <EdgePath
          key={path.id}
          edge={path.edge}
          path={path}
          selectedNodeIds={selectedNodeIds}
          dragging={isDragging}
        />
      ))}
      {draftPath ? (
        <EdgePath edge={null} path={draftPath} selectedNodeIds={selectedNodeIds} dragging={isDragging} preview />
      ) : null}
    </svg>
  )
}
