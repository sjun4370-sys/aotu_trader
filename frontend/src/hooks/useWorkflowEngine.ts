import { useCallback } from 'react'
import type { WorkflowNode, WorkflowEdge } from '../types/workflow'
import type { NodeExecutionResult } from '../types/workflowExecution'
import { useNodeExecutor } from './useNodeExecutor'
import { inferOutputFromNodeType } from '../utils/nodeDataSchema'
import { MOCK_CURRENCIES } from '../data/currencies'

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const inDegree = new Map<string, number>()
  const adjacencyList = new Map<string, string[]>()
  
  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacencyList.set(node.id, [])
  }
  
  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.fromNodeId)
    if (neighbors) {
      neighbors.push(edge.toNodeId)
    }
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) || 0) + 1)
  }
  
  const queue: string[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId)
    }
  }
  
  const sorted: WorkflowNode[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodeMap.get(nodeId)
    if (node) {
      sorted.push(node)
    }
    
    const neighbors = adjacencyList.get(nodeId)
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }
  }
  
  if (sorted.length !== nodes.length) {
    throw new Error('Cycle detected in workflow graph')
  }
  
  return sorted
}

function getNodeById(nodeId: string, nodeMap: Map<string, WorkflowNode>): WorkflowNode | undefined {
  return nodeMap.get(nodeId)
}

function collectInputs(
  targetNode: WorkflowNode,
  edges: WorkflowEdge[],
  previousOutputs: Map<string, Record<string, unknown>>,
  nodeMap: Map<string, WorkflowNode>
): Record<string, Record<string, unknown>> {
  const inputs: Record<string, Record<string, unknown>> = {}

  for (const edge of edges) {
    if (edge.toNodeId === targetNode.id) {
      const sourceNode = getNodeById(edge.fromNodeId, nodeMap)
      if (!sourceNode) continue

      const key = sourceNode.customName

      // 优先使用实际执行结果
      if (previousOutputs.has(key)) {
        inputs[key] = previousOutputs.get(key)!
        console.debug(`[collectInputs] ${targetNode.customName} <- ${key}: found in previousOutputs, currencies:`, (inputs[key] as { currencies?: unknown[] }).currencies)
      } else {
        // 没有执行结果时，根据节点配置推断输出数据
        const inferredOutput = inferOutputFromNode(sourceNode, inputs)
        if (inferredOutput) {
          inputs[key] = inferredOutput
          console.debug(`[collectInputs] ${targetNode.customName} <- ${key}: inferred, currencies:`, (inputs[key] as { currencies?: unknown[] }).currencies)
        }
      }
    }
  }

  return inputs
}

// 生成模拟K线数据
function generateMockKlines(symbol: string, count: number = 50): unknown[] {
  const basePrices: Record<string, number> = {
    BTC: 50000, ETH: 3000, BNB: 500, XRP: 0.5, ADA: 0.4,
    DOGE: 0.08, SOL: 100, DOT: 5, MATIC: 0.6, LTC: 70,
    SHIB: 0.00001, TRX: 0.08, AVAX: 30, LINK: 10, ATOM: 8
  }
  const basePrice = basePrices[symbol] || 100
  const klines = []

  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.02
    const trend = Math.random() > 0.5 ? 1 : -1
    const change = (Math.random() * volatility * trend)
    const open = basePrice + (Math.random() - 0.5) * volatility
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5

    klines.push({
      time: Date.now() - (count - i) * 3600000,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number((Math.random() * 1000000 + 100000).toFixed(0))
    })
  }

  return klines
}

// 根据节点配置和输入数据推断输出数据
function inferOutputFromNode(
  node: WorkflowNode,
  upstreamOutputs: Record<string, Record<string, unknown>>
): Record<string, unknown> | null {
  const { type, config, customName } = node

  switch (type) {
    case 'start':
      return {
        triggered: true,
        triggeredAt: Date.now(),
        triggerType: (config.triggerType as string) || 'manual',
        executionId: `exec_${Date.now()}`
      }

    case 'currency': {
      const currencies = (config.currencies as string[]) || []
      // 必须根据用户选择的币种来输出
      return {
        currencies: currencies.map(code => {
          const currencyInfo = MOCK_CURRENCIES.find(c => c.code === code)
          return {
            code,
            name: currencyInfo?.name || code
          }
        })
      }
    }

    case 'market': {
      // 从上游节点获取币种数据
      let currencyCodes: string[] = []
      for (const upstream of Object.values(upstreamOutputs)) {
        if (upstream && Array.isArray((upstream as { currencies?: unknown[] }).currencies)) {
          currencyCodes = ((upstream as { currencies: { code: string }[] }).currencies).map(c => c.code)
          break
        }
      }
      // 如果没有上游币种数据，使用配置的币种
      if (currencyCodes.length === 0) {
        currencyCodes = (config.currencies as string[]) || ['BTC']
      }

      const klines: Record<string, unknown[]> = {}
      for (const code of currencyCodes) {
        klines[code] = generateMockKlines(code, 50)
      }

      return {
        klines,
        interval: (config.interval as string) || '1h',
        count: 50,
        symbols: currencyCodes
      }
    }

    case 'account':
      return {
        balances: [
          { asset: 'BTC', free: 0.5, locked: 0 },
          { asset: 'ETH', free: 2.0, locked: 0.1 }
        ]
      }

    case 'indicator': {
      // 从上游获取K线数据来计算指标
      let prices: number[] = []
      for (const upstream of Object.values(upstreamOutputs)) {
        if (upstream && (upstream as { klines?: unknown }).klines) {
          const klines = (upstream as { klines: Record<string, { close: number }[]> }).klines
          const firstSymbol = Object.keys(klines)[0]
          if (firstSymbol && klines[firstSymbol]) {
            prices = klines[firstSymbol].map(k => k.close)
            break
          }
        }
      }

      // 如果没有K线数据，生成模拟数据
      if (prices.length === 0) {
        prices = Array.from({ length: 50 }, () => 100 + Math.random() * 10)
      }

      const indicators = []

      // RSI
      if (prices.length >= 15) {
        let gains = 0, losses = 0
        for (let i = prices.length - 14; i < prices.length; i++) {
          const change = prices[i] - prices[i - 1]
          if (change > 0) gains += change
          else losses += Math.abs(change)
        }
        const avgGain = gains / 14
        const avgLoss = losses / 14
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        indicators.push({ type: 'rsi', value: { rsi: Number(rsi.toFixed(2)) } })
      }

      // MACD
      if (prices.length >= 26) {
        const ema = (arr: number[], period: number) => {
          const k = 2 / (period + 1)
          let value = arr.slice(0, period).reduce((a, b) => a + b, 0) / period
          for (let i = period; i < arr.length; i++) {
            value = arr[i] * k + value * (1 - k)
          }
          return value
        }
        const fastEMA = ema(prices, 12)
        const slowEMA = ema(prices, 26)
        const macd = fastEMA - slowEMA
        indicators.push({
          type: 'macd',
          value: { macd: Number(macd.toFixed(4)), signal: Number((macd * 0.9).toFixed(4)), histogram: Number((macd * 0.1).toFixed(4)) }
        })
      }

      return {
        indicators,
        calculatedAt: Date.now()
      }
    }

    case 'strategy': {
      // 从上游获取指标数据
      let action: 'buy' | 'sell' | 'hold' = 'hold'
      let confidence = 0.5
      let reason = 'No indicator data'

      for (const upstream of Object.values(upstreamOutputs)) {
        if (upstream && Array.isArray((upstream as { indicators?: unknown[] }).indicators)) {
          const indicators = (upstream as { indicators: { type: string; value: { rsi?: number } }[] }).indicators
          for (const ind of indicators) {
            if (ind.type === 'rsi' && ind.value.rsi !== undefined) {
              const rsi = ind.value.rsi
              if (rsi < 30) {
                action = 'buy'
                confidence = Number(((100 - rsi) / 100 * 0.8 + 0.1).toFixed(2))
                reason = `RSI 超卖: ${rsi.toFixed(2)}`
              } else if (rsi > 70) {
                action = 'sell'
                confidence = Number(((rsi - 30) / 100 * 0.8 + 0.1).toFixed(2))
                reason = `RSI 超买: ${rsi.toFixed(2)}`
              } else {
                action = 'hold'
                confidence = Number((0.5 + Math.random() * 0.2).toFixed(2))
                reason = `RSI 中性: ${rsi.toFixed(2)}`
              }
              break
            }
          }
          break
        }
      }

      return {
        signals: [{ action, confidence, reason }],
        strategyType: (config.strategyType as string) || 'momentum'
      }
    }

    case 'analysis':
      return {
        analysis: 'AI 分析结果...',
        model: (config.model as string) || 'mock-model'
      }

    case 'trade': {
      // 从上游获取策略信号
      let action: 'buy' | 'sell' | 'hold' = 'hold'
      let symbol = 'BTC-USDT'

      for (const upstream of Object.values(upstreamOutputs)) {
        if (upstream && Array.isArray((upstream as { signals?: unknown[] }).signals)) {
          const signals = (upstream as { signals: { action: 'buy' | 'sell' | 'hold' }[] }).signals
          if (signals.length > 0) {
            action = signals[0].action
          }
          break
        }
      }

      return {
        orderId: `ORD_${Date.now()}`,
        symbol,
        action,
        quantity: action === 'hold' ? 0 : Math.random() * 0.5,
        status: action === 'hold' ? 'skipped' : 'filled'
      }
    }

    case 'condition':
      return {
        result: Math.random() > 0.5,
        matchedCondition: (config.expression as string) || ''
      }

    case 'loop':
      return {
        loopCount: (config.count as number) || 3,
        currentIndex: 0,
        currentData: []
      }

    default:
      return inferOutputFromNodeType(type, customName)
  }
}

export function useWorkflowEngine() {
  const { executeNode } = useNodeExecutor()
  
  const runWorkflow = useCallback(async (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    onNodeStart: (nodeId: string) => void,
    onNodeComplete: (result: NodeExecutionResult) => void,
    onEdgeHighlight: (edgeId: string) => void,
    onError: (error: string) => void
  ): Promise<Map<string, NodeExecutionResult>> => {
    const sortedNodes = topologicalSort(nodes, edges)
    const nodeResults = new Map<string, NodeExecutionResult>()
    const previousOutputs = new Map<string, Record<string, unknown>>()
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    for (const node of sortedNodes) {
      const inputs = collectInputs(node, edges, previousOutputs, nodeMap)
      
      onNodeStart(node.id)
      
      edges
        .filter(e => e.fromNodeId === node.id)
        .forEach(e => onEdgeHighlight(e.id))
      
      const result = await executeNode({
        nodeId: node.id,
        customName: node.customName,
        config: { ...node.config, nodeType: node.type },
        inputs,
        previousOutputs: Object.fromEntries(previousOutputs)
      })
      
      nodeResults.set(node.id, result)
      if (result.output) {
        previousOutputs.set(node.customName, result.output)
        console.debug(`[runWorkflow] ${node.customName} output stored to previousOutputs, currencies:`, (result.output as { currencies?: unknown[] }).currencies, 'klines:', (result.output as { klines?: unknown }).klines ? Object.keys((result.output as { klines: Record<string, unknown> }).klines) : undefined)
      }
      
      onNodeComplete(result)
      
      if (result.status === 'error') {
        onError(result.error || 'Node execution failed')
        break
      }
    }
    
    return nodeResults
  }, [executeNode])
  
  return { runWorkflow }
}
