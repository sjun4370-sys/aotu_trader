import { expect, test } from '@playwright/test'

async function dragPaletteNode(page: import('@playwright/test').Page, testId: string, target: { x: number; y: number }) {
  const source = page.getByTestId(testId)
  const box = await source.boundingBox()
  if (!box) {
    throw new Error(`Missing bounding box for ${testId}`)
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 8 })
  await page.mouse.up()
}

async function dragConnection(
  page: import('@playwright/test').Page,
  from: import('@playwright/test').Locator,
  to: import('@playwright/test').Locator
) {
  const fromBox = await from.boundingBox()
  const toBox = await to.boundingBox()
  if (!fromBox || !toBox) {
    throw new Error('Missing port bounding box for drag connection')
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 })
  await page.mouse.up()
}

async function marqueeSelect(page: import('@playwright/test').Page, start: { x: number; y: number }, end: { x: number; y: number }) {
  await page.keyboard.down('Control')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 10 })
  await page.mouse.up()
  await page.keyboard.up('Control')
}

async function panCanvas(page: import('@playwright/test').Page, start: { x: number; y: number }, end: { x: number; y: number }) {
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 10 })
  await page.mouse.up()
}

async function ctrlWheelZoom(page: import('@playwright/test').Page, deltaY: number, client: { x: number; y: number }) {
  await page.getByTestId('workflow-canvas').evaluate((element, payload) => {
    element.dispatchEvent(new WheelEvent('wheel', {
      deltaY: payload.deltaY,
      ctrlKey: true,
      clientX: payload.clientX,
      clientY: payload.clientY,
      bubbles: true,
      cancelable: true
    }))
  }, { deltaY, clientX: client.x, clientY: client.y })
}

test('workflow canvas supports drag, inspector, and edge creation', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('palette-floating-panel')).toBeVisible()
  await expect(page.getByTestId('workflow-canvas')).toBeVisible()
  await expect(page.getByTestId('zoom-controls')).toBeVisible()

  await dragPaletteNode(page, 'palette-item-currency', { x: 460, y: 260 })
  await dragPaletteNode(page, 'palette-item-market', { x: 760, y: 300 })

  const currencyNode = page.locator('[data-testid^="canvas-node-"]').filter({ hasText: '币种选择器' })
  const marketNode = page.locator('[data-testid^="canvas-node-"]').filter({ hasText: '获取市场数据' })

  await expect(currencyNode).toHaveCount(1)
  await expect(marketNode).toHaveCount(1)

  await marketNode.click()
  await expect(page.getByTestId('node-inspector')).toBeVisible()
  await expect(page.getByTestId('node-quick-popover')).toHaveCount(0)

  await page.getByRole('combobox').selectOption('disabled')
  await page.getByRole('textbox').fill('{"interval":"1m"}')
  await page.getByRole('button', { name: '应用' }).click()

  await marketNode.click()
  await expect(page.getByRole('combobox')).toHaveValue('disabled')
  await expect(marketNode).toContainText('1m')

  await currencyNode.click()
  await expect(page.getByTestId('node-inspector-panel')).toContainText('币种选择器')
  await expect(page.getByTestId('node-quick-popover')).toHaveCount(0)

  await dragConnection(
    page,
    currencyNode.getByRole('button', { name: '输出端口 币种' }),
    marketNode.getByRole('button', { name: '输入端口 币种' })
  )

  const edge = page.locator('[data-testid^="workflow-edge-edge_"]')
  await expect(edge).toHaveCount(1)

  await currencyNode.click({ button: 'right' })
  await expect(page.getByTestId('node-context-menu')).toBeVisible()
  await page.getByRole('button', { name: '停用节点' }).click()

  await expect(currencyNode).toHaveAttribute('data-node-status', 'disabled')
  await expect(edge).toHaveAttribute('data-edge-disabled', 'true')

  await page.keyboard.down('Control')
  await marketNode.click()
  await page.keyboard.up('Control')
  await expect(page.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')

  await marqueeSelect(page, { x: 120, y: 80 }, { x: 900, y: 420 })
  await expect(currencyNode).toHaveAttribute('aria-pressed', 'true')
  await expect(marketNode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')

  await page.locator('[data-testid="workflow-canvas"]').hover()
  await page.mouse.wheel(0, 240)
  await expect(page.getByTestId('workflow-content')).toHaveAttribute('style', /translate\([^,]+, -?\d+px\) scale\(1\)/)

  await ctrlWheelZoom(page, -120, { x: 420, y: 260 })
  await expect(page.getByText('110%')).toBeVisible()

  await panCanvas(page, { x: 520, y: 140 }, { x: 600, y: 220 })
  await expect(page.getByTestId('workflow-content')).toHaveAttribute('style', /translate\([^,]+px, [^)]+px\) scale\(1\.1\)/)

  await page.keyboard.press('Control+A')
  await expect(currencyNode).toHaveAttribute('aria-pressed', 'true')
  await expect(marketNode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')

  await page.keyboard.press('Escape')
  await expect(currencyNode).toHaveAttribute('aria-pressed', 'false')
  await expect(marketNode).toHaveAttribute('aria-pressed', 'false')

  await page.mouse.click(520, 120)
  await expect(page.getByTestId('node-inspector-panel')).toHaveAttribute('data-visible', 'false')
})
