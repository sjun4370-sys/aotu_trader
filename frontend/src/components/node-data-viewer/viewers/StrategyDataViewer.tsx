import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface SignalItem {
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reason: string
}

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function StrategyDataViewer({ data, isInferred }: Props) {
  const signals = (data.signals as SignalItem[]) || []

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="策略信号">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>策略类型</span>
          <span className={styles.infoValue}>{String(data.strategyType || '-')}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>信号数量</span>
          <span className={styles.infoValue}>{signals.length} 个</span>
        </div>
      </div>

      {signals.length > 0 && (
        <table className={styles.dataTable} style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>动作</th>
              <th>置信度</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((sig, i) => (
              <tr key={i}>
                <td>
                  <span className={styles.statusBadge} data-action={sig.action}>
                    {sig.action === 'buy' && '📈 买入'}
                    {sig.action === 'sell' && '📉 卖出'}
                    {sig.action === 'hold' && '⏸️ 观望'}
                  </span>
                </td>
                <td>
                  <div className={styles.confidenceBar}>
                    <div className={styles.confidenceProgress}>
                      <div
                        className={styles.confidenceFill}
                        style={{ width: `${(sig.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className={styles.confidenceValue}>{(sig.confidence * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ fontSize: '0.72rem', color: 'var(--wf-muted)' }}>{sig.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BaseDataViewer>
  )
}
