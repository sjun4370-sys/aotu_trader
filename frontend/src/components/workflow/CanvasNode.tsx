import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { WorkflowNode, WorkflowPort } from '../../types/workflow'
import WorkflowNodeCard from './WorkflowNodeCard'
import CurrencyNodeContent from './node-content/CurrencyNodeContent'
import DataNodeContent from './node-content/DataNodeContent'
import StrategyNodeContent from './node-content/StrategyNodeContent'
import AINodeContent from './node-content/AINodeContent'
import ToolNodeContent from './node-content/ToolNodeContent'
import styles from './CanvasNode.module.css'

interface CanvasNodeProps {
  node: WorkflowNode
  isSelected?: boolean
  onNodeClick?: (nodeId: string, additive: boolean) => void
  onNodeContextMenu?: (event: MouseEvent<HTMLDivElement>, node: WorkflowNode) => void
  onPointerDown?: (e: ReactPointerEvent, node: WorkflowNode) => void
  onPortClick?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerEnter?: (node: WorkflowNode, port: WorkflowPort) => void
  onPortPointerLeave?: (node: WorkflowNode, port: WorkflowPort) => void
  activePortId?: string | null
}

function NodeContent({ node }: { node: WorkflowNode }) {
  switch (node.category) {
    case 'currency': return <CurrencyNodeContent node={node} />
    case 'data':     return <DataNodeContent node={node} />
    case 'strategy': return <StrategyNodeContent node={node} />
    case 'ai':       return <AINodeContent node={node} />
    case 'tool':     return <ToolNodeContent node={node} />
  }
}

export default function CanvasNode({
  node,
  isSelected,
  onNodeClick,
  onNodeContextMenu,
  onPointerDown,
  onPortClick,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerLeave,
  activePortId
}: CanvasNodeProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    onNodeClick?.(node.id, e.ctrlKey || e.metaKey)
  }

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onNodeContextMenu?.(event, node)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNodeClick?.(node.id, false)
    }
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(e, node)
  }

  const handlePortClick = (event: MouseEvent<HTMLButtonElement>, port: WorkflowPort) => {
    event.stopPropagation()
    onPortClick?.(node, port)
  }

  const handlePortPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => {
    event.stopPropagation()
    onPortPointerDown?.(event, node, port)
  }

  const handlePortPointerUp = (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => {
    event.stopPropagation()
    onPortPointerUp?.(event, node, port)
  }

  const innerClass = [styles.inner, isSelected ? styles.innerSelected : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      data-testid={`canvas-node-${node.id}`}
      className={styles.wrapper}
      data-node-status={node.status}
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
      role="button"
      tabIndex={0}
      aria-label={`工作流节点 ${node.label}`}
      aria-pressed={isSelected ? 'true' : 'false'}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
    >
      <div className={innerClass}>
        <WorkflowNodeCard
          title={node.label}
          category={node.category}
          status={node.status}
          inputs={node.inputs}
          outputs={node.outputs}
          onPortClick={handlePortClick}
          onPortPointerDown={handlePortPointerDown}
          onPortPointerUp={handlePortPointerUp}
          onPortPointerEnter={(port) => onPortPointerEnter?.(node, port)}
          onPortPointerLeave={(port) => onPortPointerLeave?.(node, port)}
          activePortId={activePortId}
        >
          <NodeContent node={node} />
        </WorkflowNodeCard>
      </div>
    </div>
  )
}
