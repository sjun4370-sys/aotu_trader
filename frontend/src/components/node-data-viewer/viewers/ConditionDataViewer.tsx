import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function ConditionDataViewer({ data, isInferred }: Props) {
  const result = data.result as boolean

  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="条件判断">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>判断结果</span>
          <span className={styles.statusBadge} data-result={String(result)}>
            {result ? '✅ 条件成立' : '❌ 条件不成立'}
          </span>
        </div>
        {data.matchedCondition ? (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>条件表达式</span>
            <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {String(data.matchedCondition)}
            </span>
          </div>
        ) : null}
      </div>
    </BaseDataViewer>
  )
}
