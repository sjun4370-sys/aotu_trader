import { useState } from 'react'
import styles from '../NodeDataViewer.module.css'

interface BaseDataViewerProps {
  data: Record<string, unknown>
  isInferred?: boolean
  title?: string
  children: React.ReactNode
}

export default function BaseDataViewer({ data, isInferred, title, children }: BaseDataViewerProps) {
  const [showJson, setShowJson] = useState(false)

  return (
    <div className={styles.dataCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          {title}
          {isInferred && (
            <span className={styles.cardBadge} data-status="inferred">推断</span>
          )}
        </div>
        <button
          className={styles.jsonToggle}
          onClick={() => setShowJson(!showJson)}
        >
          {showJson ? '收起' : 'JSON'}
        </button>
      </div>
      {showJson ? (
        <div className={styles.jsonContent}>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      ) : (
        <div className={styles.cardBody}>{children}</div>
      )}
    </div>
  )
}
