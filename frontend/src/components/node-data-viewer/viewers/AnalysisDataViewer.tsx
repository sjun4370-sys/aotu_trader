import BaseDataViewer from './BaseDataViewer'
import styles from '../NodeDataViewer.module.css'

interface Props {
  data: Record<string, unknown>
  isInferred?: boolean
}

export default function AnalysisDataViewer({ data, isInferred }: Props) {
  return (
    <BaseDataViewer data={data} isInferred={isInferred} title="AI 分析结果">
      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>使用模型</span>
          <span className={styles.infoValue}>{String(data.model || '-')}</span>
        </div>
      </div>

      {data.analysis ? (
        <div className={styles.analysisText}>
          {String(data.analysis)}
        </div>
      ) : null}
    </BaseDataViewer>
  )
}
