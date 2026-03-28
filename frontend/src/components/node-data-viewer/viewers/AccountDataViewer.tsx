import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface BalanceItem {
  asset: string
  free: number
  locked?: number
  usdValue?: number
}

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function AccountDataViewer({ data, isInferred }: Props) {
  const balances = (data.balances as BalanceItem[]) || []

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="账户余额">
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>资产</th>
            <th>可用</th>
            <th>冻结</th>
            <th>估值</th>
          </tr>
        </thead>
        <tbody>
          {balances.length > 0 ? (
            balances.map((b, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{b.asset}</td>
                <td>{b.free.toFixed(4)}</td>
                <td>{b.locked?.toFixed(4) || '0'}</td>
                <td>{b.usdValue ? `$${b.usdValue.toFixed(2)}` : '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--wf-muted)' }}>
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </BaseDataViewer>
  )
}
