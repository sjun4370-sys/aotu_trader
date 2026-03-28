import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface CurrencyItem {
  code: string
  name: string
}

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function CurrencyDataViewer({ data, isInferred }: Props) {
  const currencies = (data.currencies as CurrencyItem[]) || []

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="币种列表">
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
          </tr>
        </thead>
        <tbody>
          {currencies.length > 0 ? (
            currencies.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, color: 'var(--wf-node-currency)' }}>{c.code}</td>
                <td>{c.name}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', color: 'var(--wf-muted)' }}>
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className={styles.infoList} style={{ marginTop: 12 }}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>币种数量</span>
          <span className={styles.infoValue}>{currencies.length} 个</span>
        </div>
      </div>
    </BaseDataViewer>
  )
}
