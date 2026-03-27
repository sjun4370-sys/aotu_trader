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

function simulateStartNode(_req: SimulationRequest): SimulationResponse {
  return {
    success: true,
    output: {
      triggered: true,
      triggeredAt: Date.now(),
      triggerType: _req.config.triggerType || 'manual',
      executionId: `exec_${Date.now()}`
    },
    error: null
  }
}

function simulateCurrencyNode(req: SimulationRequest): SimulationResponse {
  const currencies = (req.config.currencies as string[]) || []
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

function simulateKlineNode(req: SimulationRequest): SimulationResponse {
  const basePrices: Record<string, number> = {
    BTC: 50000, ETH: 3000, BNB: 500, XRP: 0.5, ADA: 0.4,
    DOGE: 0.08, SOL: 100, DOT: 5, MATIC: 0.6, LTC: 70,
    SHIB: 0.00001, TRX: 0.08, AVAX: 30, LINK: 10, ATOM: 8
  }

  let currencies: { code: string; name: string }[] = []
  
  const currencyInput = req.inputs['currency']
  if (currencyInput?.currencies) {
    currencies = currencyInput.currencies as { code: string; name: string }[]
  } else if (req.config.currencies) {
    const codes = req.config.currencies as string[]
    currencies = codes.map(code => ({ code, name: getCurrencyName(code) }))
  }
  
  if (currencies.length === 0) {
    currencies = MOCK_CURRENCIES.slice(0, 3)
  }

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
      klines: klinesBySymbol,
      interval,
      count: klineCount,
      symbols: currencies.map(c => c.code)
    },
    error: null
  }
}

function simulateIndicatorNode(req: SimulationRequest): SimulationResponse {
  const indicators = (req.config.indicators as Array<{ type: string; params?: Record<string, number> }>) || [
    { type: 'rsi', params: { period: 14 } }
  ]

  const klineInput = req.inputs['kline']
  let prices: number[] = []
  
  if (klineInput?.klines && typeof klineInput.klines === 'object') {
    const klinesObj = klineInput.klines as Record<string, KlineData[]>
    const firstSymbol = Object.keys(klinesObj)[0]
    if (firstSymbol) {
      prices = klinesObj[firstSymbol].map(k => k.close)
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
  const indicatorInput = req.inputs['indicator']
  
  const signals: StrategySignal[] = []
  
  if (indicatorInput?.indicators) {
    const indicators = indicatorInput.indicators as IndicatorResult[]
    
    for (const ind of indicators) {
      if (ind.type === 'rsi') {
        const rsi = ind.value.rsi as number
        let action: 'buy' | 'sell' | 'hold'
        let confidence: number
        let reason: string
        
        if (rsi < 30) {
          action = 'buy'
          confidence = Number((100 - rsi) / 100 * 0.9 + 0.1).toFixed(2) as unknown as number
          reason = `RSI oversold at ${rsi}`
        } else if (rsi > 70) {
          action = 'sell'
          confidence = Number((rsi - 30) / 100 * 0.9 + 0.1).toFixed(2) as unknown as number
          reason = `RSI overbought at ${rsi}`
        } else {
          action = 'hold'
          confidence = Number(0.5 + Math.random() * 0.2).toFixed(2) as unknown as number
          reason = `RSI neutral at ${rsi}`
        }
        
        signals.push({ action, confidence, reason })
      }
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

const simulators: Record<string, (req: SimulationRequest) => SimulationResponse> = {
  start: simulateStartNode,
  currency: simulateCurrencyNode,
  kline: simulateKlineNode,
  indicator: simulateIndicatorNode,
  strategy: simulateStrategyNode,
  analysis: simulateAINode,
  trade: simulateTradeNode,
  market: simulateKlineNode,
}

export async function simulateNode(req: SimulationRequest): Promise<SimulationResponse> {
  const simulator = simulators[req.nodeType]
  if (!simulator) {
    return { success: false, output: null, error: `Unknown node type: ${req.nodeType}` }
  }
  return simulator(req)
}
