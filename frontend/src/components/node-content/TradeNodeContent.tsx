import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

const TRADE_TYPE_LABELS: Record<string, string> = {
  buy: '买入',
  sell: '卖出',
  close: '平仓'
}

export default function TradeNodeContent({ node }: Props) {
  const tradeType = (node.config.tradeType as string) ?? ''
  const positionSize = (node.config.positionSize as number | string) ?? ''
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>交易方向</p>
      {tradeType ? (
        <p className={styles.value}>{TRADE_TYPE_LABELS[tradeType] ?? tradeType}</p>
      ) : (
        <p className={styles.placeholder}>未配置</p>
      )}
      <p className={styles.label}>仓位大小</p>
      {positionSize ? (
        <p className={styles.value}>{positionSize}</p>
      ) : (
        <p className={styles.placeholder}>未配置</p>
      )}
    </div>
  )
}
