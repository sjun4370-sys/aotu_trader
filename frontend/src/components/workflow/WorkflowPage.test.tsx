import { fireEvent, render, screen, within } from '@testing-library/react'
import WorkflowPage from './WorkflowPage'

function dropPaletteNode(type: string, point = { x: 320, y: 220 }) {
  const paletteCard = screen.getByTestId(`palette-item-${type}`)
  const canvas = screen.getByTestId('workflow-canvas')

  Object.defineProperty(paletteCard, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 24,
      y: 96,
      left: 24,
      top: 96,
      right: 244,
      bottom: 152,
      width: 220,
      height: 56,
      toJSON: () => ({})
    })
  })

  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 100,
      y: 40,
      left: 100,
      top: 40,
      right: 1100,
      bottom: 840,
      width: 1000,
      height: 800,
      toJSON: () => ({})
    })
  })

  fireEvent.pointerDown(paletteCard, { clientX: 120, clientY: 120 })
  fireEvent.pointerMove(window, point)
  fireEvent.pointerUp(window)
}

describe('WorkflowPage', () => {
  it('renders grouped Chinese labels and all palette templates', () => {
    render(<WorkflowPage />)

    expect(screen.getByTestId('workflow-page')).toBeInTheDocument()
    expect(screen.getByText('币种')).toBeVisible()
    expect(screen.getByText('数据类')).toBeVisible()
    expect(screen.getByText('策略类')).toBeVisible()
    expect(screen.getByText('AI分析')).toBeVisible()
    expect(screen.getByText('工具类')).toBeVisible()

    expect(screen.getByTestId('palette-item-currency')).toBeVisible()
    expect(screen.getByTestId('palette-item-market')).toBeVisible()
    expect(screen.getByTestId('palette-item-account')).toBeVisible()
    expect(screen.getByTestId('palette-item-indicator')).toBeVisible()
    expect(screen.getByTestId('palette-item-strategy')).toBeVisible()
    expect(screen.getByTestId('palette-item-analysis')).toBeVisible()
    expect(screen.getByTestId('palette-item-trade')).toBeVisible()
    expect(screen.getByTestId('palette-item-condition')).toBeVisible()
    expect(screen.getByTestId('palette-item-loop')).toBeVisible()
  })

  it('toggles dragging state and preview on pointer interactions', () => {
    render(<WorkflowPage />)

    const panel = screen.getByTestId('palette-floating-panel')
    const marketCard = screen.getByTestId('palette-item-market')

    Object.defineProperty(marketCard, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 24,
        y: 96,
        left: 24,
        top: 96,
        right: 244,
        bottom: 152,
        width: 220,
        height: 56,
        toJSON: () => ({})
      })
    })

    fireEvent.pointerDown(marketCard, { clientX: 120, clientY: 220 })

    expect(panel).toHaveAttribute('data-dragging', 'true')
    const dragPreview = screen.getByTestId('palette-drag-preview')
    expect(dragPreview).toBeVisible()
    expect(within(dragPreview).getByText('获取市场数据')).toBeVisible()

    fireEvent.pointerMove(window, { clientX: 180, clientY: 260 })
    fireEvent.pointerUp(window)

    expect(panel).toHaveAttribute('data-dragging', 'false')
    expect(screen.queryByTestId('palette-drag-preview')).not.toBeInTheDocument()
  })

  it('applies inspector status and config changes', () => {
    render(<WorkflowPage />)

    dropPaletteNode('market')
    const node = screen.getByLabelText('工作流节点 获取市场数据')
    fireEvent.click(node)
    expect(screen.queryByTestId('node-quick-popover')).not.toBeInTheDocument()
    expect(screen.getByTestId('node-inspector-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByRole('option', { name: '停用' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '{"interval":"1m"}' }
    })
    fireEvent.click(screen.getByRole('button', { name: '应用' }))

    fireEvent.click(node)
    expect(screen.getByRole('combobox')).toHaveTextContent('停用')
    expect(node).toHaveTextContent('1m')
    expect(node).toHaveAttribute('data-node-status', 'disabled')
  })

  it('shows a validation error for invalid inspector JSON', () => {
    render(<WorkflowPage />)

    dropPaletteNode('strategy')
    const node = screen.getByLabelText('工作流节点 运行策略')
    fireEvent.click(node)
    expect(screen.getByTestId('node-inspector-panel')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '{bad json' }
    })
    fireEvent.click(screen.getByRole('button', { name: '应用' }))

    expect(screen.getByRole('alert')).toHaveTextContent('JSON 格式无效，请检查后再应用')
  })

  it('creates an edge by dragging from output to input, then removes it with node deletion', () => {
    const { container } = render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')

    const outputPort = within(currencyNode).getByLabelText('输出端口 币种')
    const inputPort = within(marketNode).getByLabelText('输入端口 币种')

    fireEvent.pointerDown(outputPort, { clientX: 380, clientY: 220 })
    expect(screen.getByTestId('workflow-edge-preview')).toBeInTheDocument()

    fireEvent.pointerEnter(inputPort)
    fireEvent.pointerUp(window)
    expect(screen.queryByTestId('workflow-edge-preview')).not.toBeInTheDocument()

    const edgePaths = container.querySelectorAll('[data-testid^="workflow-edge-"]')
    expect(edgePaths).toHaveLength(1)

    fireEvent.click(marketNode)
    expect(screen.getByTestId('node-inspector-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '删除节点' }))
    expect(container.querySelectorAll('[data-testid^="workflow-edge-edge_"]')).toHaveLength(0)
  })

  it('supports right-click quick actions for disabling and deleting nodes', () => {
    const { container } = render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')

    fireEvent.pointerDown(within(currencyNode).getByLabelText('输出端口 币种'), { clientX: 380, clientY: 220 })
    fireEvent.pointerEnter(within(marketNode).getByLabelText('输入端口 币种'))
    fireEvent.pointerUp(window)

    fireEvent.contextMenu(currencyNode, { clientX: 320, clientY: 220 })
    expect(screen.getByTestId('node-context-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '停用节点' }))

    expect(currencyNode).toHaveAttribute('data-node-status', 'disabled')
    expect(container.querySelector('[data-testid^="workflow-edge-"]')).toHaveAttribute('data-edge-disabled', 'true')

    fireEvent.contextMenu(currencyNode, { clientX: 320, clientY: 220 })
    fireEvent.click(within(screen.getByTestId('node-context-menu')).getByRole('button', { name: '删除节点' }))
    expect(screen.queryByLabelText('工作流节点 币种选择器')).not.toBeInTheDocument()
  })

  it('opens inspector directly when selecting different nodes', () => {
    render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')
    const inspector = screen.getByTestId('node-inspector-panel')

    fireEvent.click(currencyNode)
    expect(within(inspector).getByText('币种选择器')).toBeInTheDocument()
    expect(screen.queryByTestId('node-quick-popover')).not.toBeInTheDocument()

    fireEvent.click(marketNode)
    expect(within(inspector).getByText('获取市场数据')).toBeInTheDocument()
    expect(screen.queryByTestId('node-quick-popover')).not.toBeInTheDocument()
  })

  it('supports ctrl-click multi-selection and hides inspector', () => {
    render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')

    fireEvent.click(currencyNode)
    expect(screen.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'true')

    fireEvent.click(marketNode, { ctrlKey: true })
    expect(screen.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')
    expect(currencyNode).toHaveAttribute('aria-pressed', 'true')
    expect(marketNode).toHaveAttribute('aria-pressed', 'true')
  })

  it('moves all selected nodes together', () => {
    render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')

    fireEvent.click(currencyNode)
    fireEvent.click(marketNode, { ctrlKey: true })

    fireEvent.pointerDown(currencyNode, { clientX: 320, clientY: 220, button: 0 })
    fireEvent.pointerMove(screen.getByTestId('workflow-canvas'), { clientX: 380, clientY: 280 })
    fireEvent.pointerUp(screen.getByTestId('workflow-canvas'), { clientX: 380, clientY: 280 })

    expect(currencyNode.getAttribute('style')).not.toContain('translate(180px, 132px)')
    expect(marketNode.getAttribute('style')).not.toContain('translate(516px, 180px)')
  })

  it('clears selection when clicking empty canvas', () => {
    render(<WorkflowPage />)

    dropPaletteNode('market')
    const canvas = screen.getByTestId('workflow-canvas')
    fireEvent.click(screen.getByLabelText('工作流节点 获取市场数据'))
    expect(screen.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'true')

    fireEvent.click(canvas)

    expect(screen.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')
  })

  it('supports wheel pan and ctrl-wheel zoom', () => {
    render(<WorkflowPage />)

    const canvas = screen.getByTestId('workflow-canvas')
    const content = screen.getByTestId('workflow-content')

    fireEvent.wheel(canvas, { deltaY: 120 })
    expect(content.getAttribute('style')).toContain('translate(0px, -120px)')

    fireEvent.wheel(canvas, { deltaY: -120, ctrlKey: true, clientX: 400, clientY: 300 })
    expect(screen.getByText('110%')).toBeInTheDocument()
  })

  it('uses shift-wheel for horizontal-only pan', () => {
    render(<WorkflowPage />)

    const canvas = screen.getByTestId('workflow-canvas')
    const content = screen.getByTestId('workflow-content')

    fireEvent.wheel(canvas, { deltaY: 120, shiftKey: true })

    expect(content.getAttribute('style')).toContain('translate(-120px, 0px)')
  })

  it('supports ctrl+a select all and escape clear', () => {
    render(<WorkflowPage />)

    dropPaletteNode('currency', { x: 280, y: 180 })
    dropPaletteNode('market', { x: 620, y: 220 })

    const currencyNode = screen.getByLabelText('工作流节点 币种选择器')
    const marketNode = screen.getByLabelText('工作流节点 获取市场数据')

    fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
    expect(currencyNode).toHaveAttribute('aria-pressed', 'true')
    expect(marketNode).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(currencyNode).toHaveAttribute('aria-pressed', 'false')
    expect(marketNode).toHaveAttribute('aria-pressed', 'false')
  })

})
