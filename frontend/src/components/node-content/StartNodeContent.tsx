import type { WorkflowNode } from '../../types/workflow'
import styles from './NodeContent.shared.module.css'

interface Props { node: WorkflowNode }

export default function StartNodeContent({ node }: Props) {
  return <div className={styles.container} />
}
