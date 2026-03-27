import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function StrategyNodeContent({ node }: Props) {
  const name = (node.config.strategyName as string) ?? ''
  return (
    <div className={styles.container}>
      <p className={styles.label}>策略名称</p>
      {name ? <p className={styles.value}>{name}</p> : <p className={styles.placeholder}>未配置</p>}
    </div>
  )
}
