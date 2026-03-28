import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function IndicatorNodeContent({ node }: Props) {
  const hasConfig = !!(node.config.indicators && (node.config.indicators as string[]).length > 0)

  if (hasConfig) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      <p className={styles.placeholder}>未配置</p>
    </div>
  )
}
