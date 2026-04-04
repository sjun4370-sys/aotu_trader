import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function DataNodeContent({ node }: Props) {
  const { type, config } = node

  // 检查是否有配置
  let hasConfig = false
  if (type === 'market') {
    hasConfig = !!(config.dataType || config.interval)
  } else if (type === 'account') {
    hasConfig = !!config.account
  } else if (type === 'indicator') {
    hasConfig = !!config.indicator
  } else if (type === 'okx_candles') {
    hasConfig = !!(config.bar || (config.inst_ids && (config.inst_ids as string[]).length > 0))
  } else if (type === 'okx_ticker') {
    hasConfig = !!config.inst_id
  } else if (type === 'okx_orderbook') {
    hasConfig = !!config.inst_id
  }

  // 如果有配置，body 留空（subtitle 已经显示完整信息）
  if (hasConfig) {
    return <div className={styles.container} />
  }

  // 没有配置时显示提示
  return (
    <div className={styles.container}>
      <p className={styles.placeholder}>未配置</p>
    </div>
  )
}
