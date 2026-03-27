import type { WorkflowNode } from '../../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

const TOOL_TYPE_LABELS: Record<string, string> = {
  trade: '执行交易',
  condition: '条件判断',
  loop: '循环控制'
}

export default function ToolNodeContent({ node }: Props) {
  const typeLabel = TOOL_TYPE_LABELS[node.type] ?? '工具'
  return (
    <div className={styles.container}>
      <p className={styles.label}>{typeLabel}</p>
      <p className={styles.placeholder}>待配置</p>
    </div>
  )
}
