import { useEffect } from 'react'
import type { WorkflowNodeStatus } from '../../types/workflow'
import styles from './NodeContextMenu.module.css'

interface NodeContextMenuProps {
  left: number
  top: number
  status: WorkflowNodeStatus
  onClose: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

export default function NodeContextMenu({
  left,
  top,
  status,
  onClose,
  onToggleStatus,
  onDelete
}: NodeContextMenuProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handlePointerDown = () => {
      onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [onClose])

  return (
    <div
      className={styles.menu}
      style={{ left, top }}
      data-testid="node-context-menu"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className={styles.menuItem} onClick={onToggleStatus}>
        {status === 'enabled' ? '停用节点' : '启用节点'}
      </button>
      <button type="button" className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onDelete}>
        删除节点
      </button>
    </div>
  )
}
