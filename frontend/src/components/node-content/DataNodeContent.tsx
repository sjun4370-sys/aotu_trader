import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

const DATA_TYPE_LABELS: Record<string, string> = {
  market: '市场数据',
  account: '账户数据',
  indicator: '技术指标'
}

export default function DataNodeContent({ node }: Props) {
  const typeLabel = DATA_TYPE_LABELS[node.type] ?? '数据'
  const interval = (node.config.interval as string) ?? ''
  return (
    <div className={styles.container}>
      <p className={styles.label}>{typeLabel}</p>
      {interval ? <p className={styles.value}>{interval}</p> : <p className={styles.placeholder}>未配置</p>}
    </div>
  )
}
