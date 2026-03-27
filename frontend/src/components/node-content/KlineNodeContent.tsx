import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function KlineNodeContent({ node }: Props) {
  const timeframe = (node.config.timeframe as string) ?? ''
  const symbol = (node.config.symbol as string) ?? ''
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>K线周期</p>
      {timeframe ? <p className={styles.value}>{timeframe}</p> : <p className={styles.placeholder}>未配置</p>}
      <p className={styles.label}>交易品种</p>
      {symbol ? <p className={styles.value}>{symbol}</p> : <p className={styles.placeholder}>未配置</p>}
    </div>
  )
}
