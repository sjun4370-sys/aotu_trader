import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowEdge, WorkflowNode, WorkflowNodeStatus } from '../../types/workflow'
import type { NodeExecutionResult } from '../../types/workflowExecution'
import { MultiSelect, type CurrencyOption } from '../ui/multi-select'
import { StatusSelect } from '../ui/status-select'
import { MOCK_CURRENCIES } from '../../data/currencies'
import NodeDataViewer from '../node-data-viewer/NodeDataViewer'
import styles from './NodeInspector.module.css'

interface NodeInspectorProps {
  node: WorkflowNode | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  nodeResults?: Map<string, NodeExecutionResult>
  runningNodeId?: string | null
  onClose: () => void
  onDelete?: () => void
  onApply?: (payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  trigger: '触发',
  currency: '货币',
  data: '数据',
  strategy: '策略',
  ai: 'AI',
  tool: '工具'
}

interface TriggerTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

const TRIGGER_OPTIONS = [
  { value: 'manual', label: '手动触发' },
  { value: 'schedule', label: '定时触发' },
  { value: 'event', label: '事件触发' }
]

const MARKET_DATA_OPTIONS = [
  { value: 'kline', label: 'K线数据' },
  { value: 'ticker', label: '实时行情' },
  { value: 'trade', label: '成交历史' },
  { value: 'depth', label: '订单簿/深度' },
  { value: 'info', label: '币对信息' }
]

const INTERVAL_OPTIONS = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '4h', label: '4小时' },
  { value: '1d', label: '1天' },
  { value: '1w', label: '1周' }
]

const ACCOUNT_OPTIONS = [
  { value: 'main', label: '主账户' },
  { value: 'quant', label: '量化账户' },
  { value: 'test', label: '测试账户' }
]

// 技术指标选项
interface IndicatorParam {
  name: string
  label: string
  type: 'number' | 'select'
  default: number | string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  hint?: string
}

interface IndicatorOption {
  value: string
  label: string
  params: IndicatorParam[]
  description: string
  needsDataSource: boolean  // 是否需要数据源
}

const INDICATOR_OPTIONS: IndicatorOption[] = [
  {
    value: 'rsi',
    label: 'RSI 强弱指数',
    description: '衡量价格变动的速度和幅度，判断超买超卖',
    needsDataSource: true,
    params: [
      { name: 'period', label: '计算周期', type: 'number', default: 14, min: 2, max: 100, hint: '数值越大越平滑' }
    ]
  },
  {
    value: 'macd',
    label: 'MACD 指数平滑',
    description: '显示价格动量的变化趋势',
    needsDataSource: true,
    params: [
      { name: 'fast', label: '快线周期', type: 'number', default: 12, min: 2, max: 50 },
      { name: 'slow', label: '慢线周期', type: 'number', default: 26, min: 2, max: 100 },
      { name: 'signal', label: '信号线周期', type: 'number', default: 9, min: 2, max: 50 }
    ]
  },
  {
    value: 'bollinger',
    label: '布林带',
    description: '显示价格的波动范围',
    needsDataSource: true,
    params: [
      { name: 'period', label: '周期', type: 'number', default: 20, min: 2, max: 100 },
      { name: 'stdDev', label: '标准差倍数', type: 'number', default: 2, min: 0.5, max: 10 }
    ]
  },
  {
    value: 'ma',
    label: 'MA 移动平均线',
    description: '平滑价格曲线，显示趋势方向',
    needsDataSource: true,
    params: [
      { name: 'period', label: '周期', type: 'number', default: 20, min: 1, max: 200 },
      { name: 'type', label: '均线类型', type: 'select', default: 'sma', options: [
        { value: 'sma', label: '简单均线 SMA' },
        { value: 'ema', label: '指数均线 EMA' },
        { value: 'wma', label: '加权均线 WMA' }
      ]}
    ]
  },
  {
    value: 'kd',
    label: 'KD 随机指标',
    description: '判断价格相对高低位置',
    needsDataSource: true,
    params: [
      { name: 'kPeriod', label: 'K线周期', type: 'number', default: 9, min: 1, max: 50 },
      { name: 'dPeriod', label: 'D线周期', type: 'number', default: 3, min: 1, max: 50 }
    ]
  },
  {
    value: 'atr',
    label: 'ATR 平均真实波幅',
    description: '衡量价格波动剧烈程度',
    needsDataSource: true,
    params: [
      { name: 'period', label: '周期', type: 'number', default: 14, min: 2, max: 100 }
    ]
  },
  {
    value: 'obv',
    label: 'OBV 能量潮',
    description: '累计成交量，判断资金流向',
    needsDataSource: true,
    params: []
  }
]

// 通用的简单下拉选择组件
interface SimpleSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

function SimpleSelect({ value, onChange, options, className }: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn(styles.triggerSelectWrapper, className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.triggerSelectBtn}
      >
        <span className={styles.triggerSelectLabel}>{selected?.label || '请选择'}</span>
        <ChevronDown className={cn(styles.triggerSelectChevron, isOpen && styles.triggerSelectChevronOpen)} />
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
              className={cn(styles.triggerSelectOption, opt.value === value && styles.triggerSelectOptionActive)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className={styles.triggerSelectCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// IndicatorSelect 组件
interface IndicatorSelectProps {
  value: string
  onChange: (value: string) => void
}

function IndicatorSelect({ value, onChange }: IndicatorSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = INDICATOR_OPTIONS.find(o => o.value === value) ?? INDICATOR_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={styles.triggerSelectWrapper}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.triggerSelectBtn}
      >
        <span className={styles.triggerSelectLabel}>{selected.label}</span>
        <ChevronDown className={cn(styles.triggerSelectChevron, isOpen && styles.triggerSelectChevronOpen)} />
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {INDICATOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
              className={cn(styles.triggerSelectOption, opt.value === value && styles.triggerSelectOptionActive)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className={styles.triggerSelectCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface AccountSelectProps {
  value: string
  onChange: (value: string) => void
}

function AccountSelect({ value, onChange }: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = ACCOUNT_OPTIONS.find(o => o.value === value) ?? ACCOUNT_OPTIONS[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={styles.triggerSelectWrapper}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.triggerSelectBtn}
      >
        <span className={styles.triggerSelectLabel}>{selected.label}</span>
        <ChevronDown className={cn(styles.triggerSelectChevron, isOpen && styles.triggerSelectChevronOpen)} />
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {ACCOUNT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
              className={cn(styles.triggerSelectOption, opt.value === value && styles.triggerSelectOptionActive)}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check className={styles.triggerSelectCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface DataTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

function DataTypeSelect({ value, onChange }: DataTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = MARKET_DATA_OPTIONS.find(o => o.value === value) ?? MARKET_DATA_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className={styles.triggerSelectWrapper} ref={containerRef}>
      <button
        className={styles.triggerSelectBtn}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.triggerSelectLabel}>{selected.label}</span>
        <svg className={[styles.triggerSelectChevron, isOpen ? styles.triggerSelectChevronOpen : ''].join(' ')} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {MARKET_DATA_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={[styles.triggerSelectOption, opt.value === value ? styles.triggerSelectOptionActive : ''].join(' ')}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg className={styles.triggerSelectCheck} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface IntervalSelectProps {
  value: string
  onChange: (value: string) => void
}

function IntervalSelect({ value, onChange }: IntervalSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = INTERVAL_OPTIONS.find(o => o.value === value) ?? INTERVAL_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className={styles.triggerSelectWrapper} ref={containerRef}>
      <button
        className={styles.triggerSelectBtn}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.triggerSelectLabel}>{selected.label}</span>
        <svg className={[styles.triggerSelectChevron, isOpen ? styles.triggerSelectChevronOpen : ''].join(' ')} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={[styles.triggerSelectOption, opt.value === value ? styles.triggerSelectOptionActive : ''].join(' ')}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg className={styles.triggerSelectCheck} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TriggerTypeSelect({ value, onChange }: TriggerTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = TRIGGER_OPTIONS.find(o => o.value === value) ?? TRIGGER_OPTIONS[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className={styles.triggerSelectWrapper} ref={containerRef}>
      <button
        className={styles.triggerSelectBtn}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={styles.triggerSelectLabel}>{selected.label}</span>
        <svg className={[styles.triggerSelectChevron, isOpen ? styles.triggerSelectChevronOpen : ''].join(' ')} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {isOpen && (
        <div className={styles.triggerSelectDropdown} role="listbox">
          {TRIGGER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={[styles.triggerSelectOption, opt.value === value ? styles.triggerSelectOptionActive : ''].join(' ')}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg className={styles.triggerSelectCheck} width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NodeInspectorContent({
  node,
  nodes,
  edges,
  nodeResults,
  runningNodeId,
  onClose,
  onDelete,
  onApply
}: {
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  nodeResults?: Map<string, NodeExecutionResult>
  runningNodeId?: string | null
  onClose: () => void
  onDelete?: () => void
  onApply?: (payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => void
}) {
  const [configText, setConfigText] = useState(() => JSON.stringify(node.config, null, 2))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const [status, setStatus] = useState<WorkflowNodeStatus>(() => node.status)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(
    () => (node.config.currencies as string[]) ?? []
  )
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>(
    () => (node.config.triggerType as string) || 'manual'
  )
  const [triggerSchedule, setTriggerSchedule] = useState<string>(
    () => (node.config.schedule as string) || '* * * * *'
  )

  // 按输入端口组织数据
  interface InputPortData {
    port: { id: string; label: string; direction: string }
    source: WorkflowNode | null
    data: Record<string, unknown> | null
    isInferred: boolean
    isReal: boolean
  }

  const getInputDataByPort = (): InputPortData[] => {
    return node.inputs.map(input => {
      const edge = edges.find(e => e.toNodeId === node.id && e.toPortId === input.id)
      if (!edge) {
        return { port: input, source: null, data: null, isInferred: false, isReal: false }
      }

      const sourceNode = nodeById.get(edge.fromNodeId)
      if (!sourceNode) {
        return { port: input, source: null, data: null, isInferred: false, isReal: false }
      }

      const sourceResult = nodeResults?.get(edge.fromNodeId)
      let data: Record<string, unknown>
      let isReal = false

      // 优先使用实际执行结果
      if (sourceResult?.output) {
        data = sourceResult.output
        isReal = true
      } else {
        // 没有执行结果时，根据节点配置推断数据
        data = inferOutputFromNodeConfig(sourceNode)
      }

      return { port: input, source: sourceNode, data, isInferred: !isReal, isReal }
    })
  }

  // 根据节点配置推断输出数据
  const inferOutputFromNodeConfig = (sourceNode: WorkflowNode): Record<string, unknown> => {
    const { type, config } = sourceNode

    switch (type) {
      case 'start':
        return {
          triggered: true,
          triggeredAt: Date.now(),
          triggerType: (config.triggerType as string) || 'manual',
          executionId: '-'
        }

      case 'currency': {
        const currencies = (config.currencies as string[]) || []
        return {
          currencies: currencies.map(code => {
            const currencyInfo = MOCK_CURRENCIES.find(c => c.code === code)
            return { code, name: currencyInfo?.name || code }
          })
        }
      }

      case 'market': {
        const dataType = (config.dataType as string) || 'kline'
        const klines: Record<string, unknown[]> = {}
        const currencyCodes = (config.currencies as string[]) || []
        for (const code of currencyCodes) {
          klines[code] = generatePreviewKlines(code, 10)
        }
        return {
          dataType,
          klines,
          interval: (config.interval as string) || '1h',
          count: 10,
          symbols: currencyCodes
        }
      }

      case 'account': {
        const accountType = (config.account as string) || 'main'
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
          accountType,
          balances: accountBalances[accountType] || accountBalances.main,
          accountName: accountType === 'main' ? '主账户' : accountType === 'quant' ? '量化账户' : '测试账户'
        }
      }

      case 'indicator': {
        const indicator = (config.indicator as string) || 'rsi'
        const params = (config.indicatorParams as Record<string, number>) || {}
        return {
          indicators: [
            { type: indicator, value: {} }
          ],
          indicator,
          params
        }
      }

      case 'strategy':
        return {
          signals: [{ action: 'hold', confidence: 0.5, reason: '等待指标数据' }],
          strategyType: (config.strategyType as string) || 'momentum'
        }

      case 'trade':
        return {
          orderId: '-',
          symbol: 'BTC-USDT',
          action: 'hold',
          quantity: 0,
          status: 'pending'
        }

      case 'analysis':
        return {
          analysis: '等待输入数据...',
          model: (config.model as string) || 'mock-model'
        }

      case 'condition':
        return { result: true, matchedCondition: (config.expression as string) || '' }

      case 'loop':
        return { loopCount: (config.count as number) || 3, currentIndex: 0, currentData: [] }

      // 新增节点类型推断
      case 'okx_ticker':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          last: 50000,
          bid: 49999,
          ask: 50001,
          open_24h: '49000',
          high_24h: '51000',
          low_24h: '48000',
          vol_24h: '1000000',
          change_24h: '2.5'
        }

      case 'okx_candles':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          bar: (config.bar as string) || '1h',
          candles: [],
          closes: [],
          count: 0,
          latest_close: 50000
        }

      case 'okx_orderbook':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          bids: [[49999, 1], [49998, 2], [49997, 3]],
          asks: [[50001, 1], [50002, 2], [50003, 3]],
          best_bid: 49999,
          best_ask: 50001
        }

      case 'okx_account':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          balances: [
            { asset: 'BTC', free: 1.5, locked: 0.1 },
            { asset: 'ETH', free: 10.0, locked: 0.5 },
            { asset: 'USDT', free: 50000, locked: 0 }
          ],
          equity: 100000
        }

      case 'okx_positions':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          positions: [],
          total_upl: 0
        }

      case 'rsi':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: (config.period as number) || 14,
          rsi: 50,
          signal: 'neutral',
          trend: 'sideways',
          history: []
        }

      case 'macd':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          fast: 12,
          slow: 26,
          signal: 9,
          macd: 0,
          histogram: 0,
          crossover: 'none'
        }

      case 'bollinger':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: 20,
          stdDev: 2,
          upper: 51000,
          middle: 50000,
          lower: 49000
        }

      case 'ma':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: 20,
          ma_type: 'sma',
          ma: 50000,
          trend: 'up'
        }

      case 'llm_analysis':
        return {
          provider: (config.provider as string) || 'openai',
          model: (config.model as string) || 'gpt-4',
          analysis: '等待AI分析...',
          sentiment: 'neutral',
          recommendation: 'hold',
          confidence: 0.5
        }

      case 'signal_generator':
        return {
          action: 'hold',
          confidence: 0.5,
          reason: '等待信号生成'
        }

      case 'risk_check':
        return {
          approved: true,
          reason: '风控检查通过'
        }

      case 'stop_loss':
        return {
          triggered: false,
          reason: '未触发止损'
        }

      case 'take_profit':
        return {
          triggered: false,
          reason: '未触发止盈'
        }

      case 'position_sizing':
        return {
          qty: 0,
          value: 0,
          reason: '等待计算'
        }

      case 'create_order':
        return {
          order_id: '-',
          symbol: (config.symbol as string) || 'BTC-USDT',
          side: 'buy',
          qty: 0,
          price: 0,
          status: 'pending'
        }

      case 'monitor_order':
        return {
          status: 'pending',
          filled_qty: 0
        }

      case 'cancel_order':
        return {
          success: false,
          reason: '等待取消'
        }

      case 'query_position':
        return {
          positions: [],
          total_upl: 0
        }

      default:
        return {}
    }
  }

  // 根据输入数据推断当前节点的输出
  const inferCurrentOutput = (): Record<string, unknown> => {
    const { type, config } = node

    switch (type) {
      case 'currency': {
        const currencies = selectedCurrencies.length > 0 ? selectedCurrencies : (config.currencies as string[]) || []
        return {
          currencies: currencies.map(code => {
            const currencyInfo = MOCK_CURRENCIES.find(c => c.code === code)
            return { code, name: currencyInfo?.name || code }
          })
        }
      }

      case 'market': {
        // 使用配置中的数据类型
        const dataType = (config.dataType as string) || 'kline'
        // 使用配置中的币种
        const currencyCodes: string[] = (config.currencies as string[]) || []
        const klines: Record<string, unknown[]> = {}
        for (const code of currencyCodes) {
          klines[code] = generatePreviewKlines(code, 10)
        }
        return { dataType, klines, interval: (config.interval as string) || '1h', count: 10, symbols: currencyCodes }
      }

      case 'indicator': {
        const indicator = (config.indicator as string) || 'rsi'
        const params = (config.indicatorParams as Record<string, number>) || {}
        return {
          indicators: [
            { type: indicator, value: {} }
          ],
          indicator,
          params
        }
      }

      case 'strategy': {
        let action: 'buy' | 'sell' | 'hold' = 'hold'
        for (const item of inputDataByPort) {
          if (item.data && Array.isArray((item.data as { indicators?: unknown[] }).indicators)) {
            action = Math.random() > 0.5 ? 'buy' : 'sell'
            break
          }
        }
        return {
          signals: [{ action, confidence: 0.75, reason: '策略信号预览' }],
          strategyType: (config.strategyType as string) || 'momentum'
        }
      }

      case 'trade':
        return {
          orderId: '-',
          symbol: 'BTC-USDT',
          action: 'buy',
          quantity: 0,
          status: 'pending'
        }

      case 'analysis':
        return {
          analysis: 'AI 分析结果预览...',
          model: (config.model as string) || 'mock-model'
        }

      case 'condition':
        return { result: true, matchedCondition: (config.expression as string) || '' }

      case 'loop':
        return { loopCount: (config.count as number) || 3, currentIndex: 0, currentData: [] }

      case 'start':
        return {
          triggered: true,
          triggeredAt: Date.now(),
          triggerType: (config.triggerType as string) || 'manual',
          executionId: '-'
        }

      case 'account': {
        const accountType = (config.account as string) || 'main'
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
          accountType,
          balances: accountBalances[accountType] || accountBalances.main,
          accountName: accountType === 'main' ? '主账户' : accountType === 'quant' ? '量化账户' : '测试账户'
        }
      }

      // 新增节点类型推断
      case 'okx_ticker':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          last: 50000,
          bid: 49999,
          ask: 50001,
          open_24h: '49000',
          high_24h: '51000',
          low_24h: '48000',
          vol_24h: '1000000',
          change_24h: '2.5'
        }

      case 'okx_candles':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          bar: (config.bar as string) || '1h',
          candles: [],
          closes: [],
          count: 0,
          latest_close: 50000
        }

      case 'okx_orderbook':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          bids: [[49999, 1], [49998, 2], [49997, 3]],
          asks: [[50001, 1], [50002, 2], [50003, 3]],
          best_bid: 49999,
          best_ask: 50001
        }

      case 'okx_account':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          balances: [
            { asset: 'BTC', free: 1.5, locked: 0.1 },
            { asset: 'ETH', free: 10.0, locked: 0.5 },
            { asset: 'USDT', free: 50000, locked: 0 }
          ],
          equity: 100000
        }

      case 'okx_positions':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          positions: [],
          total_upl: 0
        }

      case 'rsi':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: (config.period as number) || 14,
          rsi: 50,
          signal: 'neutral',
          trend: 'sideways',
          history: []
        }

      case 'macd':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          fast: 12,
          slow: 26,
          signal: 9,
          macd: 0,
          histogram: 0,
          crossover: 'none'
        }

      case 'bollinger':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: 20,
          stdDev: 2,
          upper: 51000,
          middle: 50000,
          lower: 49000
        }

      case 'ma':
        return {
          inst_id: (config.inst_id as string) || 'BTC-USDT',
          period: 20,
          ma_type: 'sma',
          ma: 50000,
          trend: 'up'
        }

      case 'llm_analysis':
        return {
          provider: (config.provider as string) || 'openai',
          model: (config.model as string) || 'gpt-4',
          analysis: 'AI 分析结果预览...',
          sentiment: 'neutral',
          recommendation: 'hold',
          confidence: 0.5
        }

      case 'signal_generator':
        return {
          action: 'hold',
          confidence: 0.5,
          reason: '策略信号预览'
        }

      case 'risk_check':
        return {
          approved: true,
          reason: '风控检查通过'
        }

      case 'stop_loss':
        return {
          triggered: false,
          reason: '未触发止损'
        }

      case 'take_profit':
        return {
          triggered: false,
          reason: '未触发止盈'
        }

      case 'position_sizing':
        return {
          qty: 0,
          value: 0,
          reason: '等待计算'
        }

      case 'create_order':
        return {
          order_id: '-',
          symbol: (config.symbol as string) || 'BTC-USDT',
          side: 'buy',
          qty: 0,
          price: 0,
          status: 'pending'
        }

      case 'monitor_order':
        return {
          status: 'pending',
          filled_qty: 0
        }

      case 'cancel_order':
        return {
          success: false,
          reason: '等待取消'
        }

      case 'query_position':
        return {
          positions: [],
          total_upl: 0
        }

      default:
        return {}
    }
  }

  // 生成预览K线
  const generatePreviewKlines = (symbol: string, count: number): unknown[] => {
    const basePrices: Record<string, number> = {
      BTC: 50000, ETH: 3000, BNB: 500, XRP: 0.5, ADA: 0.4,
      DOGE: 0.08, SOL: 100, DOT: 5, MATIC: 0.6, LTC: 70
    }
    const basePrice = basePrices[symbol] || 100
    return Array.from({ length: count }, (_, i) => ({
      time: Date.now() - (count - i) * 3600000,
      open: basePrice,
      high: basePrice * 1.01,
      low: basePrice * 0.99,
      close: basePrice + (Math.random() - 0.5) * basePrice * 0.02,
      volume: Math.random() * 100000
    }))
  }

  // 获取当前节点的输出数据
  const getOutputData = () => {
    const result = nodeResults?.get(node.id)
    if (result?.output) return result.output

    // 根据输入数据推断当前节点的输出
    return inferCurrentOutput()
  }

  const inputDataByPort = getInputDataByPort()
  const outputData = getOutputData()
  const isRunning = runningNodeId === node.id
  const currentResult = nodeResults?.get(node.id)
  const hasRealResults = currentResult?.output !== undefined

  // 判断是否有任何输入数据
  const hasInputData = inputDataByPort.some(item => item.data !== null)
  // 判断是否有任何推断数据
  const hasInferredInputData = inputDataByPort.some(item => item.isInferred)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedDataType, setSelectedDataType] = useState<string>(
    () => (node.config.dataType as string) || 'kline'
  )
  const [selectedInterval, setSelectedInterval] = useState<string>(
    () => (node.config.interval as string) || '1h'
  )
  const [klineCount, setKlineCount] = useState<number>(
    () => (node.config.klineCount as number) || 100
  )
  const [tradeLimit, setTradeLimit] = useState<number>(
    () => (node.config.tradeLimit as number) || 50
  )
  const [depthLevels, setDepthLevels] = useState<number>(
    () => (node.config.depthLevels as number) || 20
  )
  const [selectedAccount, setSelectedAccount] = useState<string>(
    () => (node.config.account as string) || 'main'
  )

  // 技术指标节点：可用数据源（基于节点类型判断）
  interface DataSourceInfo {
    nodeId: string
    nodeLabel: string
    dataType: string
    hasKlines: boolean
  }

  const availableDataSources: DataSourceInfo[] = useMemo(() => {
    if (node.type !== 'indicator') return []
    const sources: DataSourceInfo[] = []
    for (const edge of edges) {
      if (edge.toNodeId === node.id) {
        const sourceNode = nodeById.get(edge.fromNodeId)
        if (sourceNode) {
          // 市场节点输出K线数据
          const outputsKlines = sourceNode.type === 'market'
          sources.push({
            nodeId: sourceNode.id,
            nodeLabel: sourceNode.label,
            dataType: sourceNode.type,
            hasKlines: outputsKlines
          })
        }
      }
    }
    return sources
  }, [node.type, edges, nodeById, node.id])

  // 技术指标节点：选中的指标类型
  const [selectedIndicator, setSelectedIndicator] = useState<string>(
    () => (node.config.indicator as string) || 'rsi'
  )

  // 技术指标节点：指标参数
  const [indicatorParams, setIndicatorParams] = useState<Record<string, number>>(
    () => (node.config.indicatorParams as Record<string, number>) || {}
  )

  // 技术指标节点：选中的数据源
  const [selectedDataSourceNodeId, setSelectedDataSourceNodeId] = useState<string>(
    () => (node.config.dataSourceNodeId as string) || ''
  )

  // 自动选择数据源
  useEffect(() => {
    if (node.type !== 'indicator') return
    if (!selectedDataSourceNodeId && availableDataSources.length === 1) {
      setSelectedDataSourceNodeId(availableDataSources[0].nodeId)
    }
  }, [node.type, availableDataSources, selectedDataSourceNodeId])

  // 市场节点：从上游获取可用币种
  const upstreamCurrencies: CurrencyOption[] = useMemo(() => {
    if (node.type !== 'market') return []
    for (const item of inputDataByPort) {
      if (item.data && Array.isArray((item.data as { currencies?: unknown[] }).currencies)) {
        return ((item.data as { currencies: { code: string; name: string }[] }).currencies)
      }
    }
    return []
  }, [node.type, inputDataByPort])

  const [selectedMarketCurrencies, setSelectedMarketCurrencies] = useState<string[]>(
    () => {
      const saved = node.config.currencies as string[] | undefined
      if (saved && saved.length > 0) return saved
      // 默认选择第一个上游币种
      if (upstreamCurrencies.length > 0) return [upstreamCurrencies[0].code]
      return []
    }
  )

  // 当上游币种加载后，如果当前没有选中任何币种，自动选择第一个
  useEffect(() => {
    if (node.type === 'market' && upstreamCurrencies.length > 0 && selectedMarketCurrencies.length === 0) {
      setSelectedMarketCurrencies([upstreamCurrencies[0].code])
    }
  }, [node.type, upstreamCurrencies, selectedMarketCurrencies.length])


  const handleApply = () => {
    try {
      const parsed = JSON.parse(configText) as Record<string, unknown>
      if (node.type === 'currency') {
        parsed.currencies = selectedCurrencies
      }
      if (node.type === 'account') {
        parsed.account = selectedAccount
      }
      if (node.type === 'start') {
        parsed.triggerType = selectedTriggerType
        if (selectedTriggerType === 'schedule') {
          parsed.schedule = triggerSchedule
        }
      }
      if (node.type === 'market') {
        parsed.currencies = selectedMarketCurrencies
        parsed.dataType = selectedDataType
        parsed.interval = selectedInterval
        parsed.klineCount = klineCount
        parsed.tradeLimit = tradeLimit
        parsed.depthLevels = depthLevels
      }
      if (node.type === 'indicator') {
        parsed.indicator = selectedIndicator
        parsed.indicatorParams = indicatorParams
        parsed.dataSourceNodeId = selectedDataSourceNodeId
      }
      setErrorMessage('')
      setIsSaving(true)
      setSaveSuccess(false)

      // 模拟保存过程
      setTimeout(() => {
        onApply?.({ config: parsed, status })
        setIsSaving(false)
        setSaveSuccess(true)
        // 0.8秒后隐藏成功状态
        setTimeout(() => setSaveSuccess(false), 800)
      }, 300)
    } catch {
      setErrorMessage('JSON 格式无效，请检查后再应用')
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.title}>{node.label}</span>
          <span className={styles.categoryBadge} data-category={node.category}>
            {CATEGORY_LABELS[node.category] ?? node.category}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭检查器">
          ×
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>基本信息</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>状态</dt>
            <dd className={styles.infoValue}>
              <StatusSelect
                value={status}
                onChange={setStatus}
              />
            </dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>配置</h3>
          {node.type === 'start' ? (
            <div className={styles.triggerConfig}>
              <div className={styles.configRow}>
                <span className={styles.configLabel}>触发模式</span>
                <TriggerTypeSelect
                  value={selectedTriggerType}
                  onChange={setSelectedTriggerType}
                />
              </div>
              {selectedTriggerType === 'schedule' && (
                <div className={styles.scheduleInput}>
                  <span className={styles.configLabel}>Cron 表达式</span>
                  <input
                    type="text"
                    className={styles.configInput}
                    value={triggerSchedule}
                    onChange={(e) => setTriggerSchedule(e.target.value)}
                    placeholder="* * * * *"
                  />
                  <span className={styles.configHint}>格式: 分 时 日 月 周 (例: 0 9 * * * 每天9点)</span>
                </div>
              )}
            </div>
          ) : node.type === 'currency' ? (
            <div className={styles.currencyConfig}>
              <span className={styles.configLabel}>选择币种</span>
              <MultiSelect
                options={MOCK_CURRENCIES as CurrencyOption[]}
                value={selectedCurrencies}
                onChange={setSelectedCurrencies}
                placeholder="搜索并选择币种..."
              />
            </div>
          ) : node.type === 'account' ? (
            <div className={styles.marketConfig}>
              <div className={styles.configRow}>
                <span className={styles.configLabel}>选择账户</span>
                <AccountSelect
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                />
              </div>
            </div>
          ) : node.type === 'market' ? (
            <div className={styles.marketConfig}>
              {upstreamCurrencies.length > 0 ? (
                <div className={styles.configField}>
                  <span className={styles.configLabel}>选择币种</span>
                  <MultiSelect
                    options={upstreamCurrencies}
                    value={selectedMarketCurrencies}
                    onChange={setSelectedMarketCurrencies}
                    placeholder="从上游币种中选择..."
                  />
                </div>
              ) : (
                <p className={styles.configHint}>暂无可用货币</p>
              )}
              <div className={styles.configRow}>
                <span className={styles.configLabel}>数据类型</span>
                <DataTypeSelect
                  value={selectedDataType}
                  onChange={setSelectedDataType}
                />
              </div>
              {selectedDataType === 'kline' && (
                <>
                  <div className={styles.configRow}>
                    <span className={styles.configLabel}>周期</span>
                    <IntervalSelect
                      value={selectedInterval}
                      onChange={setSelectedInterval}
                    />
                  </div>
                  <div className={styles.configField}>
                    <span className={styles.configLabel}>K线数量</span>
                    <input
                      type="number"
                      className={styles.configInput}
                      value={klineCount}
                      onChange={(e) => setKlineCount(Number(e.target.value))}
                      min={1}
                      max={1000}
                    />
                  </div>
                </>
              )}
              {selectedDataType === 'trade' && (
                <div className={styles.configField}>
                  <span className={styles.configLabel}>成交记录数</span>
                  <input
                    type="number"
                    className={styles.configInput}
                    value={tradeLimit}
                    onChange={(e) => setTradeLimit(Number(e.target.value))}
                    min={1}
                    max={500}
                  />
                </div>
              )}
              {selectedDataType === 'depth' && (
                <div className={styles.configField}>
                  <span className={styles.configLabel}>深度档位数</span>
                  <input
                    type="number"
                    className={styles.configInput}
                    value={depthLevels}
                    onChange={(e) => setDepthLevels(Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                </div>
              )}
            </div>
          ) : node.type === 'indicator' ? (
            <div className={styles.marketConfig}>
              {/* 指标选择 - 放在最上面 */}
              <div className={styles.configRow}>
                <span className={styles.configLabel}>计算指标</span>
                <IndicatorSelect
                  value={selectedIndicator}
                  onChange={setSelectedIndicator}
                />
              </div>

              {/* 数据源选择 - 只在需要数据源时显示 */}
              {(() => {
                const indicator = INDICATOR_OPTIONS.find(i => i.value === selectedIndicator)
                if (!indicator?.needsDataSource) return null
                const compatibleSources = availableDataSources.filter(ds => ds.hasKlines)
                return (
                  <div className={styles.configField}>
                    <span className={styles.configLabel}>数据来源</span>
                    {compatibleSources.length === 0 ? (
                      <p className={styles.configHint}>暂无可用的K线数据源（请先连接市场数据节点）</p>
                    ) : compatibleSources.length === 1 ? (
                      <div className={styles.indicatorDataSource}>
                        <span className={styles.indicatorDataSourceName}>{compatibleSources[0].nodeLabel}</span>
                        <span className={styles.indicatorDataSourceOk}>✓</span>
                      </div>
                    ) : (
                      <SimpleSelect
                        value={selectedDataSourceNodeId}
                        onChange={setSelectedDataSourceNodeId}
                        options={[
                          { value: '', label: '请选择数据源' },
                          ...compatibleSources.map(ds => ({ value: ds.nodeId, label: ds.nodeLabel }))
                        ]}
                      />
                    )}
                  </div>
                )
              })()}

              {/* 指标参数 */}
              {(() => {
                const indicator = INDICATOR_OPTIONS.find(i => i.value === selectedIndicator)
                if (!indicator || indicator.params.length === 0) return null
                return (
                  <div className={styles.indicatorParams}>
                    <span className={styles.configLabel}>参数配置</span>
                    {indicator.params.map(param => (
                      <div key={param.name} className={styles.configField}>
                        <span className={styles.configLabel}>{param.label}</span>
                        {param.type === 'number' ? (
                          <input
                            type="number"
                            className={styles.configInput}
                            value={indicatorParams[param.name] ?? param.default}
                            onChange={(e) => setIndicatorParams(prev => ({
                              ...prev,
                              [param.name]: Number(e.target.value)
                            }))}
                            min={param.min}
                            max={param.max}
                          />
                        ) : param.type === 'select' && param.options ? (
                          <SimpleSelect
                            value={String(indicatorParams[param.name] ?? param.default)}
                            onChange={(val) => setIndicatorParams(prev => ({
                              ...prev,
                              [param.name]: Number(val)
                            }))}
                            options={param.options}
                          />
                        ) : null}
                        {param.hint && <span className={styles.configHint}>{param.hint}</span>}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : (
            <textarea
              className={styles.configTextarea}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder="{}"
              spellCheck={false}
            />
          )}
          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>端口信息</h3>
          {node.inputs.length > 0 ? (
            <div className={styles.portGroup}>
              <p className={styles.portGroupLabel}>输入端口</p>
              {node.inputs.map((port) => {
                const sourceNodeIds = edges
                  .filter((e) => e.toNodeId === node.id && e.toPortId === port.id)
                  .map((e) => e.fromNodeId)
                const sourceLabels = sourceNodeIds.map((id) => nodeById.get(id)?.label ?? id)
                return (
                  <div key={port.id} className={styles.portRow}>
                    <span className={styles.portName}>{port.label}</span>
                    <span className={styles.portBadge} data-direction={port.direction}>
                      输入
                    </span>
                    {sourceLabels.length > 0 && (
                      <span className={styles.portSources}>
                        来源: {sourceLabels.join(', ')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
          {node.outputs.length > 0 ? (
            <div className={styles.portGroup}>
              <p className={styles.portGroupLabel}>输出端口</p>
              {node.outputs.map((port) => (
                <div key={port.id} className={styles.portRow}>
                  <span className={styles.portName}>{port.label}</span>
                  <span className={styles.portBadge} data-direction={port.direction}>
                    输出
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {node.inputs.length === 0 && node.outputs.length === 0 ? (
            <p className={styles.emptyPorts}>无端口</p>
          ) : null}
        </section>

        {/* 输入数据展示 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>输入数据</h3>
          {isRunning ? (
            <p className={styles.statusText} data-status="running">执行中...</p>
          ) : hasInputData ? (
            <>
              {hasInferredInputData && (
                <p className={styles.inferredHint}>
                  <span className={styles.hintIcon}>💡</span>
                  部分数据为推断结构，运行后将显示实际数据
                </p>
              )}
              <div className={styles.viewerWrapper}>
                {inputDataByPort.map((item) => (
                  <div key={item.port.id} className={styles.inputPortCard}>
                    <div className={styles.inputPortHeader}>
                      <div className={styles.inputPortInfo}>
                        <span className={styles.inputPortLabel}>{item.port.label}</span>
                        {item.source ? (
                          <span className={styles.sourceNodeTag}>
                            来自: {item.source.label}
                            <span className={styles.sourceNodeId}>({item.source.id.slice(0, 8)})</span>
                          </span>
                        ) : (
                          <span className={styles.sourceNodeTag} data-empty="true">未连接</span>
                        )}
                      </div>
                      {item.data && (
                        <span
                          className={styles.dataSourceBadge}
                          data-real={item.isReal}
                          data-inferred={item.isInferred}
                        >
                          {item.isReal ? '实际' : '推断'}
                        </span>
                      )}
                    </div>
                    {item.data ? (
                      <NodeDataViewer
                        node={item.source || { type: 'start', customName: item.port.label, id: '', category: 'data', label: item.port.label, position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, inputs: [], outputs: [], config: {}, status: 'enabled' }}
                        data={item.data}
                        isInferred={item.isInferred}
                      />
                    ) : (
                      <p className={styles.emptyPortData}>此端口未连接数据源</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : node.inputs.length > 0 ? (
            <p className={styles.emptyText}>暂无输入数据（请先连接上游节点）</p>
          ) : (
            <p className={styles.emptyText}>此节点无输入端口</p>
          )}
        </section>

        {/* 输出数据展示 */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>输出数据</h3>
          {isRunning ? (
            <p className={styles.statusText} data-status="running">执行中...</p>
          ) : currentResult?.status === 'error' ? (
            <div className={styles.errorBox}>
              <span className={styles.errorLabel}>执行错误</span>
              <span className={styles.errorMsg}>{currentResult.error}</span>
            </div>
          ) : outputData && Object.keys(outputData).length > 0 ? (
            <>
              {!hasRealResults && (
                <p className={styles.inferredHint}>
                  <span className={styles.hintIcon}>💡</span>
                  显示推断输出结构，运行后将显示实际输出
                </p>
              )}
              <NodeDataViewer
                node={node}
                data={outputData}
                isInferred={!hasRealResults}
              />
            </>
          ) : (
            <p className={styles.emptyText}>暂无输出数据</p>
          )}
        </section>
      </div>

      <footer className={styles.footer}>
        <button
          className={[styles.btnApply, isSaving ? styles.btnLoading : '', saveSuccess ? styles.btnSuccess : ''].join(' ')}
          onClick={handleApply}
          disabled={isSaving}
        >
          {isSaving ? (
            <span className={styles.spinner} />
          ) : saveSuccess ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : null}
          <span>{isSaving ? '保存中...' : saveSuccess ? '已保存' : '应用'}</span>
        </button>
        <button className={styles.btnDelete} onClick={onDelete}>删除节点</button>
      </footer>
    </>
  )
}

export default function NodeInspector({
  node,
  nodes,
  edges,
  nodeResults,
  runningNodeId,
  onClose,
  onDelete,
  onApply
}: NodeInspectorProps) {
  const isVisible = node !== null

  return (
    <div
      className={styles.panel}
      data-visible={isVisible}
      data-testid="node-inspector-panel"
    >
      {node ? (
        <NodeInspectorContent
          key={node.id}
          node={node}
          nodes={nodes}
          edges={edges}
          nodeResults={nodeResults}
          runningNodeId={runningNodeId}
          onClose={onClose}
          onDelete={onDelete}
          onApply={onApply}
        />
      ) : null}
    </div>
  )
}
