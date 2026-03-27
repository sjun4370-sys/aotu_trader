import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

const LOOP_MODE_LABELS: Record<string, string> = {
  times: '次数循环',
  datasource: '数据源循环'
}

export default function LoopNodeContent({ node }: Props) {
  const loopMode = (node.config.loopMode as string) ?? 'times'
  const count = (node.config.count as number) ?? 0
  const datasource = (node.config.datasource as string) ?? ''
  
  return (
    <div className={styles.container}>
      <p className={styles.label}>循环模式</p>
      <p className={styles.value}>{LOOP_MODE_LABELS[loopMode] ?? loopMode}</p>
      {loopMode === 'times' ? (
        <>
          <p className={styles.label}>循环次数</p>
          <p className={styles.value}>{count}</p>
        </>
      ) : (
        <>
          <p className={styles.label}>数据源</p>
          {datasource ? (
            <p className={styles.value}>{datasource}</p>
          ) : (
            <p className={styles.placeholder}>未配置</p>
          )}
        </>
      )}
    </div>
  )
}
