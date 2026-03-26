import type { PointerEvent as ReactPointerEvent } from 'react'
import type { WorkflowNodeTemplate } from '../../types/workflow'
import { NODE_TYPE_ICONS } from './nodeIcons'
import styles from './PaletteItemCard.module.css'

const CATEGORY_COLORS: Record<string, string> = {
  currency: 'var(--wf-node-currency)',
  data: 'var(--wf-node-data)',
  strategy: 'var(--wf-node-strategy)',
  ai: 'var(--wf-node-ai)',
  tool: 'var(--wf-node-tool)'
}

interface PaletteItemCardProps {
  item: WorkflowNodeTemplate
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, item: WorkflowNodeTemplate) => void
}

export default function PaletteItemCard({ item, onPointerDown }: PaletteItemCardProps) {
  const Icon = NODE_TYPE_ICONS[item.type]
  const color = CATEGORY_COLORS[item.category] ?? 'var(--wf-muted)'

  return (
    <button
      type="button"
      className={styles.card}
      data-testid={`palette-item-${item.type}`}
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      <span className={styles.iconWrap} style={{ color }}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <span className={styles.textWrap}>
        <p className={styles.title}>{item.label}</p>
        <p className={styles.meta}>
          入 {item.inputs.length}
          <span className={styles.dot} aria-hidden="true" />
          出 {item.outputs.length}
        </p>
      </span>
    </button>
  )
}
