import styles from './NodeContent.shared.module.css'

interface Props { node: import('../../types/workflow').WorkflowNode }

export default function StartNodeContent({ node: _node }: Props) {
  return <div className={styles.container} />
}
