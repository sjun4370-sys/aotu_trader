import type { WorkflowNode } from '../../types/workflow'
import { MOCK_CURRENCIES } from '../../data/currencies'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function CurrencyNodeContent({ node }: Props) {
  const selectedCodes = (node.config.currencies as string[]) ?? []
  const selectedCurrencies = MOCK_CURRENCIES.filter((c) => selectedCodes.includes(c.code))

  return (
    <div className={styles.container}>
      <p className={styles.label}>已选币种</p>
      <div className={styles.tags}>
        {selectedCurrencies.length === 0 ? (
          <span className={styles.placeholder}>未选择</span>
        ) : (
          selectedCurrencies.map((c) => (
            <span key={c.code} className={styles.tag}>{c.code}</span>
          ))
        )}
      </div>
    </div>
  )
}
