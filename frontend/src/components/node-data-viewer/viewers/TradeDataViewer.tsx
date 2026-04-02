import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function TradeDataViewer({ data, isInferred }: Props) {
  const action = data.action as string
  const status = data.status as string

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="交易订单">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>订单ID</span>
          <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
            {String(data.orderId || '-')}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>交易对</span>
          <span className={styles.infoValue}>{String(data.symbol || '-')}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>交易方向</span>
          <span className={styles.statusBadge} data-action={action}>
            {action === 'buy' && '📈 买入'}
            {action === 'sell' && '📉 卖出'}
            {action === 'hold' && '⏸️ 观望'}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>数量</span>
          <span className={styles.infoValue}>{String(data.quantity || 0)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>价格</span>
          <span className={styles.infoValue}>${Number(data.price || 0).toFixed(2)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>订单状态</span>
          <span className={styles.infoValue}>
            {status === 'filled' && '✅ 已成交'}
            {status === 'pending' && '⏳ 待成交'}
            {status === 'cancelled' && '❌ 已取消'}
            {status === 'skipped' && '⏭️ 已跳过'}
            {!status && '-'}
          </span>
        </div>
        {data.total ? (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>总金额</span>
            <span className={styles.infoValue} style={{ fontWeight: 600 }}>
              ${Number(data.total).toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>
    </BaseDataViewer>
  )
}
