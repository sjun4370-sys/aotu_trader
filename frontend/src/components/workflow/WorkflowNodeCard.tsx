import type { ReactNode } from 'react'
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { WorkflowNodeCategory, WorkflowNodeStatus, WorkflowPort } from '../../types/workflow'
import { getPortOffset } from '../../utils/workflow'
import styles from './WorkflowNodeCard.module.css'

interface WorkflowNodeCardProps {
  title: string
  subtitle?: string
  category?: WorkflowNodeCategory
  status?: WorkflowNodeStatus
  selected?: boolean
  dragging?: boolean
  inputs?: WorkflowPort[]
  outputs?: WorkflowPort[]
  children?: ReactNode
  className?: string
  onPortClick?: (event: MouseEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerEnter?: (port: WorkflowPort) => void
  onPortPointerLeave?: (port: WorkflowPort) => void
  activePortId?: string | null
}

function PortRail({
  ports,
  side,
  onPortClick,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerLeave,
  activePortId
}: {
  ports: WorkflowPort[]
  side: 'left' | 'right'
  onPortClick?: (event: MouseEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>, port: WorkflowPort) => void
  onPortPointerEnter?: (port: WorkflowPort) => void
  onPortPointerLeave?: (port: WorkflowPort) => void
  activePortId?: string | null
}) {
  const railClassName = side === 'left' ? styles.portsLeft : styles.portsRight

  return (
    <div className={railClassName}>
      {ports.map((port, index) => {
        const displayCount = ports.length
        const topPercent = displayCount === 1 ? 50 : getPortOffset(index, displayCount)
        const style = {
          top: `${topPercent}%`
        } satisfies CSSProperties

        return (
          <button
            key={port.id}
            type="button"
            className={styles.port}
            style={style}
            data-port-id={port.id}
            data-port-direction={port.direction}
            data-port-side={side}
            data-port-active={activePortId === port.id ? 'true' : 'false'}
            aria-label={`${port.direction === 'input' ? '输入' : '输出'}端口 ${port.label}`}
            title={port.label}
            onPointerDown={(event) => onPortPointerDown?.(event, port)}
            onPointerUp={(event) => onPortPointerUp?.(event, port)}
            onPointerEnter={() => onPortPointerEnter?.(port)}
            onPointerLeave={() => onPortPointerLeave?.(port)}
            onClick={(event) => onPortClick?.(event, port)}
          />
        )
      })}
    </div>
  )
}

export default function WorkflowNodeCard({
  title,
  subtitle,
  category,
  status = 'enabled',
  selected = false,
  dragging = false,
  inputs = [],
  outputs = [],
  children,
  className,
  onPortClick,
  onPortPointerDown,
  onPortPointerUp,
  onPortPointerEnter,
  onPortPointerLeave,
  activePortId = null
}: WorkflowNodeCardProps) {
  const cardClass = [styles.card, className].filter(Boolean).join(' ')

  return (
    <article
      className={cardClass}
      data-testid="workflow-node-card"
      data-category={category}
      data-status={status}
      data-selected={selected ? 'true' : 'false'}
      data-dragging={dragging ? 'true' : 'false'}
    >
      {inputs.length > 0 && (
        <PortRail
          ports={inputs.slice(0, 1)}
          side="left"
          onPortClick={onPortClick}
          onPortPointerDown={onPortPointerDown}
          onPortPointerUp={onPortPointerUp}
          onPortPointerEnter={onPortPointerEnter}
          onPortPointerLeave={onPortPointerLeave}
          activePortId={activePortId}
        />
      )}
      {outputs.length > 0 && (
        <PortRail
          ports={outputs.slice(0, 1)}
          side="right"
          onPortClick={onPortClick}
          onPortPointerDown={onPortPointerDown}
          onPortPointerUp={onPortPointerUp}
          onPortPointerEnter={onPortPointerEnter}
          onPortPointerLeave={onPortPointerLeave}
          activePortId={activePortId}
        />
      )}
      <div className={styles.accentBar} />
      <header className={styles.header}>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  )
}
