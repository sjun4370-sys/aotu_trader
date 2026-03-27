import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function StartNodeContent({ node }: Props) {
  const triggerType = (node.config.triggerType as string) ?? 'manual'
  const triggerLabel = triggerType === 'manual' ? '手动' : triggerType === 'schedule' ? '定时' : '事件'
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>触发方式</p>
      <p className={styles.value}>{triggerLabel}</p>
    </div>
  )
}
