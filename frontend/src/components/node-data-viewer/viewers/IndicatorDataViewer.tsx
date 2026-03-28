import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface IndicatorItem {
  type: string
  value: Record<string, number>
}

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function IndicatorDataViewer({ data, isInferred }: Props) {
  const indicators = (data.indicators as IndicatorItem[]) || []

  const formatIndicatorValue = (type: string, value: Record<string, number>) => {
    switch (type) {
      case 'rsi':
        return <span style={{ color: value.rsi > 70 ? 'var(--wf-error)' : value.rsi < 30 ? 'var(--wf-success)' : 'var(--wf-text)' }}>{value.rsi?.toFixed(2)}</span>
      case 'macd':
        return (
          <div className={styles.indicatorValues}>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>MACD:</span>
              <span className={styles.value}>{value.macd?.toFixed(4)}</span>
            </div>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>Signal:</span>
              <span className={styles.value}>{value.signal?.toFixed(4)}</span>
            </div>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>Hist:</span>
              <span className={styles.value} style={{ color: (value.histogram || 0) >= 0 ? 'var(--wf-success)' : 'var(--wf-error)' }}>{value.histogram?.toFixed(4)}</span>
            </div>
          </div>
        )
      case 'bollinger':
        return (
          <div className={styles.indicatorValues}>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>上轨:</span>
              <span className={styles.value}>{value.upper?.toFixed(2)}</span>
            </div>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>中轨:</span>
              <span className={styles.value}>{value.middle?.toFixed(2)}</span>
            </div>
            <div className={styles.indicatorValue}>
              <span className={styles.label}>下轨:</span>
              <span className={styles.value}>{value.lower?.toFixed(2)}</span>
            </div>
          </div>
        )
      default:
        return Object.entries(value).map(([k, v]) => (
          <div key={k} className={styles.indicatorValue}>
            <span className={styles.label}>{k}:</span>
            <span className={styles.value}>{typeof v === 'number' ? v.toFixed(4) : v}</span>
          </div>
        ))
    }
  }

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="技术指标">
      <div className={styles.indicatorList}>
        {indicators.length > 0 ? (
          indicators.map((ind, i) => (
            <div key={i} className={styles.indicatorCard}>
              <div className={styles.indicatorType}>{ind.type.toUpperCase()}</div>
              {formatIndicatorValue(ind.type, ind.value)}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>暂无指标数据</div>
        )}
      </div>
    </BaseDataViewer>
  )
}
