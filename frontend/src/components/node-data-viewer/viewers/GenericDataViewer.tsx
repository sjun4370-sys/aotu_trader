import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function GenericDataViewer({ data, isInferred }: Props) {
  const entries = Object.entries(data)

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="数据结构">
      <div className={styles.infoList}>
        {entries.length > 0 ? (
          entries.map(([key, value]) => (
            <div key={key} className={styles.infoItem}>
              <span className={styles.infoLabel}>{key}</span>
              <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>暂无数据</div>
        )}
      </div>
    </BaseDataViewer>
  )
}
