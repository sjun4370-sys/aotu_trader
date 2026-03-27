import type { WorkflowNode } from '../../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function AINodeContent({ node }: Props) {
  const model = (node.config.model as string) ?? ''
  return (
    <div className={styles.container}>
      <p className={styles.label}>分析模型</p>
      {model ? <p className={styles.value}>{model}</p> : <p className={styles.placeholder}>默认模型</p>}
    </div>
  )
}
