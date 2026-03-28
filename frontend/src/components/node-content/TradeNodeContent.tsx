import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function TradeNodeContent({ node }: Props) {
  const hasConfig = !!(node.config.tradeType || node.config.positionSize)

  // 有配置时 body 留空（subtitle 已经显示）
  if (hasConfig) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      <p className={styles.placeholder}>未配置</p>
    </div>
  )
}
