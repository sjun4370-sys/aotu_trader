import type { WorkflowNode } from '../../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function CurrencyNodeContent({ node }: Props) {
  const symbol = (node.config.symbol as string) ?? ''
  return (
    <div className={styles.container}>
      <p className={styles.label}>交易对</p>
      <p className={styles.value}>{symbol || <span className={styles.placeholder}>未选择</span>}</p>
    </div>
  )
}
