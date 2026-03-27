import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

const INDICATOR_TYPE_LABELS: Record<string, string> = {
  ma: 'MA (均线)',
  ema: 'EMA (指数移动平均)',
  macd: 'MACD',
  kdj: 'KDJ',
  rsi: 'RSI',
  boll: '布林带',
  volume: '成交量'
}

export default function IndicatorNodeContent({ node }: Props) {
  const indicators = (node.config.indicators as string[]) ?? []
  const selectedLabels = indicators.map(i => INDICATOR_TYPE_LABELS[i] ?? i)
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>指标类型</p>
      {selectedLabels.length > 0 ? (
        <div className={styles.tags}>
          {selectedLabels.map((label, idx) => (
            <span key={idx} className={styles.tag}>{label}</span>
          ))}
        </div>
      ) : (
        <p className={styles.placeholder}>未选择</p>
      )}
    </div>
  )
}
