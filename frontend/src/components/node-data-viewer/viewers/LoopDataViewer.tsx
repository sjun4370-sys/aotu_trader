import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function LoopDataViewer({ data, isInferred }: Props) {
  const loopCount = (data.loopCount as number) || 0
  const currentIndex = (data.currentIndex as number) || 0
  const currentData = data.currentData as unknown[]

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="循环组件">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>循环模式</span>
          <span className={styles.infoValue}>{String(data.source || '-')}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>总循环次数</span>
          <span className={styles.infoValue}>{loopCount} 次</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>当前索引</span>
          <span className={styles.infoValue}>{currentIndex}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>当前数据</span>
          <span className={styles.infoValue}>
            {Array.isArray(currentData) ? `${currentData.length} 项` : '-'}
          </span>
        </div>
      </div>

      {loopCount > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className={styles.confidenceBar}>
            <div className={styles.confidenceProgress}>
              <div
                className={styles.confidenceFill}
                style={{
                  width: `${((currentIndex || 0) / loopCount * 100).toFixed(0)}%`,
                  background: 'linear-gradient(90deg, var(--wf-primary), #818cf8)'
                }}
              />
            </div>
            <span className={styles.confidenceValue}>
              {currentIndex || 0}/{loopCount}
            </span>
          </div>
        </div>
      )}
    </BaseDataViewer>
  )
}
