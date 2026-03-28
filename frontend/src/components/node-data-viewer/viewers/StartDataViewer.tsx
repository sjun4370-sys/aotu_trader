import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function StartDataViewer({ data, isInferred }: Props) {
  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="触发信息">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>触发状态</span>
          <span className={styles.infoValue}>
            {data.triggered ? '✅ 已触发' : '⏳ 等待中'}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>触发类型</span>
          <span className={styles.infoValue}>
            {data.triggerType === 'manual' && '🖱️ 手动'}
            {data.triggerType === 'schedule' && '⏰ 定时'}
            {data.triggerType === 'event' && '📡 事件'}
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>执行ID</span>
          <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
            {String(data.executionId || '-')}
          </span>
        </div>
        {data.schedule && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>定时表达式</span>
            <span className={styles.infoValue} style={{ fontFamily: 'monospace' }}>
              {String(data.schedule)}
            </span>
          </div>
        )}
      </div>
    </BaseDataViewer>
  )
}
