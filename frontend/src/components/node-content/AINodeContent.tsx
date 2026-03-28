import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function AINodeContent({ node }: Props) {
  const hasConfig = !!node.config.model

  if (hasConfig) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      <p className={styles.placeholder}>未配置</p>
    </div>
  )
}
