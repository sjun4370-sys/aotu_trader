import { MOCK_CURRENCIES } from '../data/currencies'
import { resolveFieldReference } from '../utils/expressionParser'

export interface SimulationRequest {
  nodeId: string
  nodeType: string
  customName: string
  config: Record<string, unknown>
  inputs: Record<string, Record<string, unknown>>
}

export interface SimulationResponse {
  success: boolean
  output: Record<string, unknown> | null
  error: string | null
}

interface KlineData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface IndicatorResult {
  type: string
  value: Record<string, number>
}

interface StrategySignal {
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reason: string
}

function getCurrencyName(code: string): string {
  const currency = MOCK_CURRENCIES.find(c => c.code === code)
  return currency?.name || code
}

function generateMockKline(symbol: string, basePrice: number): KlineData {
  const volatility = basePrice * 0.02
  const trend = Math.random() > 0.5 ? 1 : -1
  const change = (Math.random() * volatility * trend)
  
  const open = basePrice + (Math.random() - 0.5) * volatility
  const close = open + change
  const high = Math.max(open, close) + Math.random() * volatility * 0.5
  const low = Math.min(open, close) - Math.random() * volatility * 0.5
  const volume = Math.random() * 1000000 + 100000

  return {
    time: Date.now() - Math.random() * 86400000 * 100,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume: Number(volume.toFixed(0))
  }
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) gains += change
    else losses += Math.abs(change)
  }
  
  const avgGain = gains / period
  const avgLoss = losses / period
  
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Number((100 - 100 / (1 + rs)).toFixed(2))
}

function calculateMACD(prices: number[], fast: number = 12, slow: number = 26, signal: number = 9): { macd: number; signal: number; histogram: number } {
  const ema = (arr: number[], period: number): number => {
    const k = 2 / (period + 1)
    let emaValue = arr.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = period; i < arr.length; i++) {
      emaValue = arr[i] * k + emaValue * (1 - k)
    }
    return emaValue
  }
  
  const fastEMA = ema(prices, fast)
  const slowEMA = ema(prices, slow)
  const macdLine = fastEMA - slowEMA
  
  const macdValues: number[] = []
  for (let i = slow; i < prices.length; i++) {
    const fEma = ema(prices.slice(0, i + 1), fast)
    const sEma = ema(prices.slice(0, i + 1), slow)
    macdValues.push(fEma - sEma)
  }
  
  const signalLine = macdValues.length >= signal 
    ? ema(macdValues.slice(-signal * 2), signal) 
    : macdValues.reduce((a, b) => a + b, 0) / macdValues.length
  
  const histogram = macdLine - signalLine
  
  return {
    macd: Number(macdLine.toFixed(4)),
    signal: Number(signalLine.toFixed(4)),
    histogram: Number(histogram.toFixed(4))
  }
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
  const slice = prices.slice(-period)
  const sma = slice.reduce((a, b) => a + b, 0) / period
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period
  const std = Math.sqrt(variance)
  
  return {
    upper: Number((sma + stdDev * std).toFixed(2)),
    middle: Number(sma.toFixed(2)),
    lower: Number((sma - stdDev * std).toFixed(2))
  }
}

function simulateStartNode(req: SimulationRequest): SimulationResponse {
  const triggerType = (req.config.triggerType as string) || 'manual'

  const baseOutput = {
    triggered: true,
    triggeredAt: Date.now(),
    triggerType,
    executionId: `exec_${Date.now()}`
  }

  switch (triggerType) {
    case 'manual':
      return {
        success: true,
        output: {
          ...baseOutput,
          description: 'Manual trigger activated'
        },
        error: null
      }

    case 'schedule': {
      const schedule = req.config.schedule as string
      return {
        success: true,
        output: {
          ...baseOutput,
          schedule,
          scheduleType: 'cron',
          nextRunTime: calculateNextRunTime(schedule),
          description: `Scheduled trigger: ${schedule}`
        },
        error: null
      }
    }

    case 'event':
      return {
        success: true,
        output: {
          ...baseOutput,
          eventSource: req.config.eventSource || 'unknown',
          eventType: req.config.eventType || 'price_change',
          eventData: req.config.eventData || {},
          description: `Event trigger: ${req.config.eventType || 'price_change'}`
        },
        error: null
      }

    default:
      return {
        success: true,
        output: {
          ...baseOutput,
          description: 'Unknown trigger type, treated as manual'
        },
        error: null
      }
  }
}

function calculateNextRunTime(cronExpression?: string): number | null {
  if (!cronExpression) return null
  // 简单的模拟：假设下一次运行在 1 小时后
  // 实际实现需要使用 cron-parser 库
  return Date.now() + 60 * 60 * 1000
}

function simulateCurrencyNode(req: SimulationRequest): SimulationResponse {
  const currencies = (req.config.currencies as string[]) || []
  console.debug(`[simulateCurrencyNode] node=${req.customName} config.currencies=`, currencies)
  return {
    success: true,
    output: {
      currencies: currencies.map(code => ({
        code,
        name: getCurrencyName(code)
      }))
    },
    error: null
  }
}

function simulateMarketNode(req: SimulationRequest): SimulationResponse {
  const basePrices: Record<string, number> = {
    BTC: 50000, ETH: 3000, BNB: 500, XRP: 0.5, ADA: 0.4,
    DOGE: 0.08, SOL: 100, DOT: 5, MATIC: 0.6, LTC: 70,
    SHIB: 0.00001, TRX: 0.08, AVAX: 30, LINK: 10, ATOM: 8
  }

  const dataType = (req.config.dataType as string) || 'kline'

  // 优先使用配置中选中的币种
  let currencies: { code: string; name: string }[] = []
  const configCurrencies = req.config.currencies as string[] | undefined

  if (configCurrencies && configCurrencies.length > 0) {
    // 使用配置中选中的币种
    currencies = configCurrencies.map(code => {
      const currencyInfo = MOCK_CURRENCIES.find(c => c.code === code)
      return { code, name: currencyInfo?.name || code }
    })
  } else {
    // 回退：从上游输入获取币种
    for (const inputValue of Object.values(req.inputs)) {
      if (inputValue && Array.isArray((inputValue as { currencies?: unknown }).currencies)) {
        currencies = (inputValue as { currencies: { code: string; name: string }[] }).currencies
        break
      }
    }
  }

  // 仍然没有则使用默认
  if (currencies.length === 0) {
    currencies = MOCK_CURRENCIES.slice(0, 3)
  }

  switch (dataType) {
    case 'kline': {
      const klineCount = (req.config.klineCount as number) || 100
      const interval = (req.config.interval as string) || '1h'
      const klinesBySymbol: Record<string, KlineData[]> = {}

      for (const currency of currencies) {
        const basePrice = basePrices[currency.code] || 100
        const klines: KlineData[] = []
        for (let i = 0; i < klineCount; i++) {
          klines.push(generateMockKline(currency.code, basePrice))
        }
        klinesBySymbol[currency.code] = klines.sort((a, b) => a.time - b.time)
      }

      return {
        success: true,
        output: {
          dataType,
          klines: klinesBySymbol,
          interval,
          count: klineCount,
          symbols: currencies.map(c => c.code)
        },
        error: null
      }
    }

    case 'ticker': {
      const tickers: Record<string, unknown>[] = []
      for (const currency of currencies) {
        const basePrice = basePrices[currency.code] || 100
        const change24h = ((Math.random() - 0.5) * 10).toFixed(2)
        tickers.push({
          symbol: currency.code,
          lastPrice: basePrice.toFixed(2),
          priceChange: (Number(change24h) * basePrice / 100).toFixed(2),
          priceChangePercent: change24h,
          high24h: (basePrice * 1.05).toFixed(2),
          low24h: (basePrice * 0.95).toFixed(2),
          volume24h: (Math.random() * 1000000000).toFixed(0)
        })
      }
      return {
        success: true,
        output: { dataType: 'ticker', tickers, symbols: currencies.map(c => c.code) },
        error: null
      }
    }

    case 'trade': {
      const tradeLimit = (req.config.tradeLimit as number) || 50
      const trades: Record<string, unknown[]> = {}
      for (const currency of currencies) {
        const basePrice = basePrices[currency.code] || 100
        const tradeList: unknown[] = []
        for (let i = 0; i < Math.min(tradeLimit, 50); i++) {
          tradeList.push({
            id: `trade_${Date.now()}_${i}`,
            price: (basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2),
            qty: (Math.random() * 10).toFixed(4),
            time: Date.now() - i * 1000,
            isBuyerMaker: Math.random() > 0.5
          })
        }
        trades[currency.code] = tradeList
      }
      return {
        success: true,
        output: { dataType: 'trade', trades, symbols: currencies.map(c => c.code), limit: tradeLimit },
        error: null
      }
    }

    case 'depth': {
      const depthLevels = (req.config.depthLevels as number) || 20
      const depths: Record<string, unknown> = {}
      for (const currency of currencies) {
        const basePrice = basePrices[currency.code] || 100
        const bids: [string, string][] = []
        const asks: [string, string][] = []
        for (let i = 0; i < Math.min(depthLevels, 20); i++) {
          const bidPrice = (basePrice * (1 - 0.001 * (i + 1))).toFixed(2)
          const askPrice = (basePrice * (1 + 0.001 * (i + 1))).toFixed(2)
          bids.push([bidPrice, (Math.random() * 100).toFixed(4)])
          asks.push([askPrice, (Math.random() * 100).toFixed(4)])
        }
        depths[currency.code] = { bids, asks }
      }
      return {
        success: true,
        output: { dataType: 'depth', depths, levels: depthLevels, symbols: currencies.map(c => c.code) },
        error: null
      }
    }

    case 'info': {
      const infos: Record<string, unknown>[] = []
      for (const currency of currencies) {
        infos.push({
          symbol: currency.code,
          status: 'TRADING',
          baseAsset: currency.code,
          quoteAsset: 'USDT',
          pricePrecision: 2,
          qtyPrecision: 6,
          minQty: '0.000001',
          minNotional: '10'
        })
      }
      return {
        success: true,
        output: { dataType: 'info', infos, symbols: currencies.map(c => c.code) },
        error: null
      }
    }

    default:
      return {
        success: false,
        output: null,
        error: `Unknown data type: ${dataType}`
      }
  }
}

function simulateIndicatorNode(req: SimulationRequest): SimulationResponse {
  // 支持新的单指标格式和旧的数组格式
  let indicators: Array<{ type: string; params?: Record<string, number> }> = []
  const singleIndicator = req.config.indicator as string
  const singleParams = (req.config.indicatorParams as Record<string, number>) || {}

  if (singleIndicator) {
    indicators = [{ type: singleIndicator, params: singleParams }]
  } else {
    indicators = (req.config.indicators as Array<{ type: string; params?: Record<string, number> }>) || [
      { type: 'rsi', params: { period: 14 } }
    ]
  }

  // 遍历所有输入，查找包含 klines 的上游节点
  let prices: number[] = []
  for (const inputValue of Object.values(req.inputs)) {
    if (inputValue && (inputValue as { klines?: unknown }).klines) {
      const klinesObj = (inputValue as { klines: Record<string, KlineData[]> }).klines
      const firstSymbol = Object.keys(klinesObj)[0]
      if (firstSymbol && klinesObj[firstSymbol]) {
        prices = klinesObj[firstSymbol].map(k => k.close)
        break
      }
    }
  }

  if (prices.length === 0) {
    prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 10) * 10 + Math.random() * 5)
  }

  const results: IndicatorResult[] = []

  for (const ind of indicators) {
    switch (ind.type.toLowerCase()) {
      case 'rsi': {
        const period = ind.params?.period || 14
        const value = calculateRSI(prices, period)
        results.push({ type: 'rsi', value: { rsi: value } })
        break
      }
      case 'macd': {
        const fast = ind.params?.fast || 12
        const slow = ind.params?.slow || 26
        const signal = ind.params?.signal || 9
        const { macd, signal: signalLine, histogram } = calculateMACD(prices, fast, slow, signal)
        results.push({ type: 'macd', value: { macd, signal: signalLine, histogram } })
        break
      }
      case 'bollinger': {
        const period = ind.params?.period || 20
        const stdDev = ind.params?.stdDev || 2
        const { upper, middle, lower } = calculateBollingerBands(prices, period, stdDev)
        results.push({ type: 'bollinger', value: { upper, middle, lower } })
        break
      }
      case 'ma':
      case 'ema':
      case 'wma': {
        const period = ind.params?.period || 20
        const slice = prices.slice(-period)
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length
        results.push({ type: ind.type.toLowerCase(), value: { ma: Number(avg.toFixed(2)) } })
        break
      }
      case 'kd': {
        const kPeriod = ind.params?.kPeriod || 9
        const dPeriod = ind.params?.dPeriod || 3
        // 简化KD计算
        const k = 50 + Math.random() * 30
        const d = 50 + Math.random() * 20
        results.push({ type: 'kd', value: { k: Number(k.toFixed(2)), d: Number(d.toFixed(2)) } })
        break
      }
      case 'atr': {
        const period = ind.params?.period || 14
        const atr = prices.slice(-period).reduce((a, b, i, arr) => {
          if (i === 0) return Math.abs(arr[i] - arr[i])
          return a + Math.abs(arr[i] - arr[i - 1])
        }, 0) / period
        results.push({ type: 'atr', value: { atr: Number(atr.toFixed(4)) } })
        break
      }
      case 'obv': {
        // 简化OBV计算
        const obv = prices.reduce((a, b, i) => a + (i > 0 && b > prices[i - 1] ? 1 : -1) * Math.abs(prices[i]), 0)
        results.push({ type: 'obv', value: { obv: Number(obv.toFixed(2)) } })
        break
      }
      default:
        results.push({ type: ind.type, value: {} })
    }
  }

  return {
    success: true,
    output: {
      indicators: results,
      calculatedAt: Date.now()
    },
    error: null
  }
}

function simulateStrategyNode(req: SimulationRequest): SimulationResponse {
  const signals: StrategySignal[] = []

  // 遍历所有输入，查找包含 indicators 的上游节点
  for (const inputValue of Object.values(req.inputs)) {
    if (inputValue && Array.isArray((inputValue as { indicators?: unknown }).indicators)) {
      const indicators = (inputValue as { indicators: IndicatorResult[] }).indicators

      for (const ind of indicators) {
        if (ind.type === 'rsi') {
          const rsi = ind.value.rsi as number
          let action: 'buy' | 'sell' | 'hold'
          let confidence: number
          let reason: string

          if (rsi < 30) {
            action = 'buy'
            confidence = Number(((100 - rsi) / 100 * 0.9 + 0.1).toFixed(2))
            reason = `RSI oversold at ${rsi}`
          } else if (rsi > 70) {
            action = 'sell'
            confidence = Number(((rsi - 30) / 100 * 0.9 + 0.1).toFixed(2))
            reason = `RSI overbought at ${rsi}`
          } else {
            action = 'hold'
            confidence = Number((0.5 + Math.random() * 0.2).toFixed(2))
            reason = `RSI neutral at ${rsi}`
          }

          signals.push({ action, confidence, reason })
        }
      }
      break
    }
  }
  
  if (signals.length === 0) {
    const actions: ('buy' | 'sell' | 'hold')[] = ['buy', 'sell', 'hold']
    const action = actions[Math.floor(Math.random() * actions.length)]
    signals.push({
      action,
      confidence: Number((0.5 + Math.random() * 0.45).toFixed(2)),
      reason: 'Random signal (no indicator input)'
    })
  }

  const strategyType = (req.config.strategyType as string) || 'momentum'
  
  return {
    success: true,
    output: {
      signals,
      strategyType,
      executedAt: Date.now()
    },
    error: null
  }
}

function simulateAINode(req: SimulationRequest): SimulationResponse {
  const prompt = (req.config.prompt as string) || ''
  const model = (req.config.model as string) || 'gpt-4'
  
  const context: Record<string, Record<string, unknown>> = {}
  for (const [nodeId, nodeOutput] of Object.entries(req.inputs)) {
    context[nodeId] = nodeOutput
  }

  const resolvedPrompt = prompt.replace(/\{\{([^}]+)\}\}/g, (match, ref) => {
    const value = resolveFieldReference(ref.trim(), context)
    return value !== undefined ? String(value) : match
  })

  const indicatorInput = req.inputs['indicator']
  const strategyInput = req.inputs['strategy']
  const klineInput = req.inputs['kline']
  
  let analysis = ''
  
  if (indicatorInput?.indicators) {
    const indicators = indicatorInput.indicators as IndicatorResult[]
    for (const ind of indicators) {
      if (ind.type === 'rsi') {
        analysis += `RSI: ${ind.value.rsi}. `
      }
    }
  }
  
  if (strategyInput?.signals) {
    const signals = strategyInput.signals as StrategySignal[]
    const latestSignal = signals[signals.length - 1]
    if (latestSignal) {
      analysis += `Strategy: ${latestSignal.action.toUpperCase()} signal with ${(latestSignal.confidence * 100).toFixed(0)}% confidence. `
    }
  }
  
  if (klineInput?.klines) {
    const klinesObj = klineInput.klines as Record<string, KlineData[]>
    const firstSymbol = Object.keys(klinesObj)[0]
    if (firstSymbol && klinesObj[firstSymbol].length > 0) {
      const latestKline = klinesObj[firstSymbol][klinesObj[firstSymbol].length - 1]
      analysis += `Latest price: $${latestKline.close}. `
    }
  }

  const mockResponses = [
    `Based on the current market data: ${analysis} Consider a cautious approach given recent volatility.`,
    `Analysis complete. ${analysis} Key support levels are holding.`,
    `Market scan indicates: ${analysis} Waiting for clearer signals before entry.`,
    `Comprehensive review of ${analysis} suggests maintaining current positions.`
  ]

  return {
    success: true,
    output: {
      analysis: mockResponses[Math.floor(Math.random() * mockResponses.length)],
      prompt: resolvedPrompt,
      model,
      analyzedAt: Date.now()
    },
    error: null
  }
}

function simulateTradeNode(req: SimulationRequest): SimulationResponse {
  const tradeType = (req.config.tradeType as string) || 'spot'
  const positionSize = (req.config.positionSize as number) || 0
  const symbol = (req.config.symbol as string) || 'BTC'

  const strategyInput = req.inputs['strategy']
  const klineInput = req.inputs['kline']

  let action: 'buy' | 'sell' | 'hold' = 'hold'
  let price = 50000

  if (strategyInput?.signals) {
    const signals = strategyInput.signals as StrategySignal[]
    const latestSignal = signals[signals.length - 1]
    if (latestSignal) {
      action = latestSignal.action
    }
  }

  if (klineInput?.klines) {
    const klinesObj = klineInput.klines as Record<string, KlineData[]>
    if (klinesObj[symbol]) {
      price = klinesObj[symbol][klinesObj[symbol].length - 1].close
    }
  }

  const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const quantity = positionSize > 0 ? positionSize : action === 'hold' ? 0 : Math.random() * 0.5
  const status = action === 'hold' ? 'skipped' : 'filled'

  return {
    success: true,
    output: {
      orderId,
      symbol,
      action,
      price,
      quantity: Number(quantity.toFixed(6)),
      tradeType,
      status,
      filledAt: status === 'filled' ? Date.now() : null,
      total: Number((price * quantity).toFixed(2))
    },
    error: null
  }
}

function simulateConditionNode(req: SimulationRequest): SimulationResponse {
  const expression = (req.config.expression as string) || ''

  const context: Record<string, Record<string, unknown>> = {}
  for (const [nodeName, nodeOutput] of Object.entries(req.inputs)) {
    context[nodeName] = nodeOutput
  }

  const fieldRefPattern = /\{\{([^}]+)\}\}/g
  const matches = [...expression.matchAll(fieldRefPattern)]

  const evaluationDetails: Record<string, unknown> = {}

  for (const match of matches) {
    const reference = match[1].trim()
    const parts = reference.split('.')
    if (parts.length === 2) {
      const [nodeName, field] = parts
      const value = context[nodeName]?.[field]
      evaluationDetails[reference] = value
    }
  }

  const mockResult = Math.random() > 0.5

  return {
    success: true,
    output: {
      result: mockResult,
      matchedCondition: expression,
      evaluationDetails,
      evaluatedAt: Date.now()
    },
    error: null
  }
}

function simulateLoopNode(req: SimulationRequest): SimulationResponse {
  const mode = (req.config.mode as string) || 'count'
  const count = (req.config.count as number) || 3

  let loopCount = count
  let currentData: unknown[] = []

  if (mode === 'datasource') {
    const dataSource = req.config.dataSource as { nodeId?: string; field?: string } | undefined
    if (dataSource?.nodeId && dataSource?.field) {
      const sourceOutput = req.inputs[dataSource.nodeId]
      if (sourceOutput && sourceOutput[dataSource.field]) {
        currentData = sourceOutput[dataSource.field] as unknown[]
        loopCount = currentData.length
      }
    }
  }

  return {
    success: true,
    output: {
      loopCount,
      currentIndex: 0,
      currentData,
      totalLoops: loopCount,
      source: mode === 'count' ? `count:${count}` : 'datasource',
      startedAt: Date.now()
    },
    error: null
  }
}

function simulateAccountNode(req: SimulationRequest): SimulationResponse {
  const accountType = (req.config.account as string) || 'main'

  const accountBalances: Record<string, { asset: string; free: number; locked: number }[]> = {
    main: [
      { asset: 'BTC', free: 1.5, locked: 0.1 },
      { asset: 'ETH', free: 10.0, locked: 0.5 },
      { asset: 'USDT', free: 50000, locked: 0 }
    ],
    quant: [
      { asset: 'BTC', free: 0.5, locked: 0 },
      { asset: 'ETH', free: 5.0, locked: 0.2 },
      { asset: 'BNB', free: 20, locked: 0 }
    ],
    test: [
      { asset: 'BTC', free: 0.01, locked: 0 },
      { asset: 'ETH', free: 0.1, locked: 0 }
    ]
  }

  return {
    success: true,
    output: {
      accountType,
      balances: accountBalances[accountType] || accountBalances.main,
      accountName: accountType === 'main' ? '主账户' : accountType === 'quant' ? '量化账户' : '测试账户'
    },
    error: null
  }
}

const simulators: Record<string, (req: SimulationRequest) => SimulationResponse> = {
  start: simulateStartNode,
  currency: simulateCurrencyNode,
  kline: simulateMarketNode,
  indicator: simulateIndicatorNode,
  strategy: simulateStrategyNode,
  analysis: simulateAINode,
  trade: simulateTradeNode,
  market: simulateMarketNode,
  account: simulateAccountNode,
  condition: simulateConditionNode,
  loop: simulateLoopNode,
}

export async function simulateNode(req: SimulationRequest): Promise<SimulationResponse> {
  const simulator = simulators[req.nodeType]
  if (!simulator) {
    return { success: false, output: null, error: `Unknown node type: ${req.nodeType}` }
  }
  return simulator(req)
}
