import { renderHook, act } from '@testing-library/react'
import { useWorkflowCanvas } from './useWorkflowCanvas'
import {
  WORKFLOW_CANVAS_MAX_ZOOM,
  WORKFLOW_CANVAS_MIN_ZOOM
} from './useWorkflowCanvas'

describe('useWorkflowCanvas hook', () => {
  it('clamps zoom within bounds', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      result.current.setZoom(999)
    })
    expect(result.current.zoom).toBe(WORKFLOW_CANVAS_MAX_ZOOM)

    act(() => {
      result.current.setZoom(0.1)
    })
    expect(result.current.zoom).toBe(WORKFLOW_CANVAS_MIN_ZOOM)
  })

  it('steps zoom by 0.1 increments', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      result.current.zoomIn()
    })
    expect(result.current.zoom).toBe(1.1)

    act(() => {
      result.current.zoomOut()
    })
    expect(result.current.zoom).toBe(1)
  })

  it('clamps zoomIn at max zoom', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      for (let i = 0; i < 20; i += 1) {
        result.current.zoomIn()
      }
    })
    expect(result.current.zoom).toBe(WORKFLOW_CANVAS_MAX_ZOOM)
  })

  it('clamps zoomOut at min zoom', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      for (let i = 0; i < 20; i += 1) {
        result.current.zoomOut()
      }
    })
    expect(result.current.zoom).toBe(WORKFLOW_CANVAS_MIN_ZOOM)
  })

  it('handles non-finite zoom input gracefully', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      result.current.setZoom(NaN)
    })
    expect(result.current.zoom).toBe(1)

    act(() => {
      result.current.setZoom(Infinity)
    })
    expect(result.current.zoom).toBe(1)
  })

  it('resetView restores zoom and offset', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      result.current.setZoom(1.3)
      result.current.setCanvasOffset({ x: 100, y: 40 })
      result.current.setSelectedNodeIds(['node-a', 'node-b'])
    })
    expect(result.current.zoom).toBe(1.3)
    expect(result.current.canvasOffset).toEqual({ x: 100, y: 40 })
    expect(result.current.selectedNodeIds).toEqual(['node-a', 'node-b'])

    act(() => {
      result.current.resetView()
    })
    expect(result.current.zoom).toBe(1)
    expect(result.current.canvasOffset).toEqual({ x: 0, y: 0 })
    expect(result.current.selectedNodeIds).toEqual(['node-a', 'node-b'])
  })

  it('zooms around the provided viewport point', () => {
    const { result } = renderHook(() => useWorkflowCanvas())
    act(() => {
      result.current.setCanvasOffset({ x: 40, y: 30 })
      result.current.zoomAtPoint(1.2, { x: 200, y: 140 })
    })

    expect(result.current.zoom).toBe(1.2)
    expect(result.current.canvasOffset).toEqual({ x: 8, y: 8 })
  })
})
