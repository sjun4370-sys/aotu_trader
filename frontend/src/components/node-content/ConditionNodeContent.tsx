import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function ConditionNodeContent({ node }: Props) {
  const expression = (node.config.expression as string) ?? ''
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>条件表达式</p>
      {expression ? (
        <p className={styles.value}>{expression}</p>
      ) : (
        <p className={styles.placeholder}>未配置</p>
      )}
    </div>
  )
}
