import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { WORKFLOW_PALETTE_GROUPS } from '../../data/palette'
import type { WorkflowNodeTemplate } from '../../types/workflow'
import PaletteItemCard from './PaletteItemCard'
import styles from './PaletteFloatingPanel.module.css'

interface PaletteDragPoint {
  x: number
  y: number
}

export interface PaletteDragPayload {
  item: WorkflowNodeTemplate
  point: PaletteDragPoint
  grabOffset: PaletteDragPoint
  source: 'palette'
}

interface ActiveDragState {
  payload: PaletteDragPayload
  isDragging: boolean
}

interface PaletteFloatingPanelProps {
  onDragStart?: (payload: PaletteDragPayload) => void
  onDragMove?: (payload: PaletteDragPayload) => void
  onDragEnd?: (payload: PaletteDragPayload) => void
}

export default function PaletteFloatingPanel({
  onDragStart,
  onDragMove,
  onDragEnd
}: PaletteFloatingPanelProps = {}) {
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null)
  const callbacksRef = useRef({
    onDragStart,
    onDragMove,
    onDragEnd
  })
  const dragPayloadRef = useRef<PaletteDragPayload | null>(null)
  const isDragging = activeDrag?.isDragging ?? false
  const totalTemplateCount = WORKFLOW_PALETTE_GROUPS.reduce(
    (count, group) => count + group.items.length,
    0
  )

  useEffect(() => {
    callbacksRef.current = {
      onDragStart,
      onDragMove,
      onDragEnd
    }
  }, [onDragStart, onDragMove, onDragEnd])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      setActiveDrag((previous) => {
        if (!previous?.isDragging) {
          return previous
        }

        const nextPoint = {
          x: event.clientX,
          y: event.clientY
        }
        const nextPayload = {
          ...previous.payload,
          point: nextPoint
        }
        dragPayloadRef.current = nextPayload
        callbacksRef.current.onDragMove?.(nextPayload)

        return {
          payload: nextPayload,
          isDragging: true
        }
      })
    }

    const stopDragging = () => {
      const payload = dragPayloadRef.current
      dragPayloadRef.current = null
      if (payload) {
        callbacksRef.current.onDragEnd?.(payload)
      }
      setActiveDrag(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [isDragging])

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    item: WorkflowNodeTemplate
  ) => {
    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const rectLeft = Number.isFinite(rect.left) ? rect.left : rect.x
    const rectTop = Number.isFinite(rect.top) ? rect.top : rect.y
    const grabOffset = {
      x: event.clientX - rectLeft,
      y: event.clientY - rectTop
    }
    const initialPoint = {
      x: event.clientX,
      y: event.clientY
    }
    const payload: PaletteDragPayload = {
      item,
      point: initialPoint,
      grabOffset,
      source: 'palette'
    }
    dragPayloadRef.current = payload
    setActiveDrag({
      payload,
      isDragging: true
    })
    callbacksRef.current.onDragStart?.(payload)
  }

  const dragPayload = activeDrag?.payload
  const previewLeft = dragPayload
    ? dragPayload.point.x - dragPayload.grabOffset.x
    : 0
  const previewTop = dragPayload
    ? dragPayload.point.y - dragPayload.grabOffset.y
    : 0

  return (
    <>
      <aside
        data-testid="palette-floating-panel"
        data-dragging={isDragging ? 'true' : 'false'}
        className={`${styles.panel} glass-panel`}
        data-glass="strong"
      >
        <div className={styles.header}>
          <p className={styles.title}>节点组件库</p>
          <p className={styles.subtitle}>按分类选择 · 共 {totalTemplateCount} 个模板</p>
        </div>

        <div className={styles.groups}>
          {WORKFLOW_PALETTE_GROUPS.map((group) => (
            <section key={group.category} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              <ul className={styles.groupList}>
                {group.items.map((item) => (
                  <li key={item.type}>
                    <PaletteItemCard item={item} onPointerDown={handlePointerDown} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>

      {dragPayload ? (
        <div
          data-testid="palette-drag-preview"
          className={styles.preview}
          style={{
            left: `${Number.isFinite(previewLeft) ? previewLeft : 0}px`,
            top: `${Number.isFinite(previewTop) ? previewTop : 0}px`
          }}
        >
          <p className={styles.previewTitle}>{dragPayload.item.label}</p>
          <p className={styles.previewMeta}>
            入 {dragPayload.item.inputs.length} · 出 {dragPayload.item.outputs.length}
          </p>
        </div>
      ) : null}
    </>
  )
}
