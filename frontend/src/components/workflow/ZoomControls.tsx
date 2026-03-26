import { WORKFLOW_CANVAS_MAX_ZOOM, WORKFLOW_CANVAS_MIN_ZOOM } from '../../hooks/useWorkflowCanvas'
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon } from './icons'
import styles from './ZoomControls.module.css'

type ZoomControlsProps = {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  className?: string
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  className
}: ZoomControlsProps) {
  const isZoomOutDisabled = zoom <= WORKFLOW_CANVAS_MIN_ZOOM
  const isZoomInDisabled = zoom >= WORKFLOW_CANVAS_MAX_ZOOM

  return (
    <div data-testid="zoom-controls" className={[styles.zoomControls, className].filter(Boolean).join(' ')}>
      <button type="button" className={styles.btn} onClick={onZoomOut} disabled={isZoomOutDisabled} title="缩小" aria-label="缩小画布">
        <ZoomOutIcon size={16} />
      </button>
      <span className={styles.zoomLabel}>{`${Math.round(zoom * 100)}%`}</span>
      <button type="button" className={styles.btn} onClick={onZoomIn} disabled={isZoomInDisabled} title="放大" aria-label="放大画布">
        <ZoomInIcon size={16} />
      </button>
      <button type="button" className={styles.btn} onClick={onReset} title="重置视图" aria-label="重置画布视图">
        <MaximizeIcon size={16} />
      </button>
    </div>
  )
}
