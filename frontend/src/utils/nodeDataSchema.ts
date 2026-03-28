/**
 * 节点输入/输出数据结构定义
 * 用于在配置界面展示数据预览
 */

export interface DataField {
  label: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description?: string
  children?: DataField[]
}

export interface NodeDataSchema {
  inputs: Record<string, DataField[]>
  outputs: DataField[]
}

// 根据节点类型获取其输入输出数据结构
export function getNodeInputSchema(nodeType: string): DataField[] {
  const schemas: Record<string, DataField[]> = {
    // 触发节点 - 只有一个触发信号
    start: [],

    // 币种选择器 - 需要触发信号作为输入
    currency: [
      { label: 'trigger', type: 'object', description: '触发信号' }
    ],

    // K线获取 - 需要币种数据作为输入
    market: [
      {
        label: 'currency',
        type: 'object',
        description: '币种信息',
        children: [
          { label: 'code', type: 'string', description: '币种代码' },
          { label: 'name', type: 'string', description: '币种名称' }
        ]
      }
    ],

    // 账户数据 - 需要触发信号
    account: [
      { label: 'trigger', type: 'object', description: '触发信号' }
    ],

    // 指标计算 - 需要K线数据
    indicator: [
      {
        label: 'klines',
        type: 'object',
        description: 'K线数据',
        children: [
          { label: '[symbol]', type: 'array', description: 'K线数组' }
        ]
      }
    ],

    // 策略 - 接收任意输入
    strategy: [
      { label: 'input', type: 'object', description: '输入数据' }
    ],

    // AI分析 - 接收任意输入
    analysis: [
      { label: 'input', type: 'object', description: '输入数据' }
    ],

    // 交易执行 - 接收策略信号
    trade: [
      { label: 'strategy', type: 'object', description: '策略信号' },
      { label: 'kline', type: 'object', description: 'K线数据（可选）' }
    ],

    // 条件器 - 接收任意输入
    condition: [
      { label: 'input', type: 'object', description: '输入数据' }
    ],

    // 循环 - 接收任意输入
    loop: [
      { label: 'input', type: 'object', description: '输入数据' }
    ]
  }

  return schemas[nodeType] || []
}

export function getNodeOutputSchema(nodeType: string): DataField[] {
  const schemas: Record<string, DataField[]> = {
    start: [
      { label: 'triggered', type: 'boolean', description: '是否触发' },
      { label: 'triggeredAt', type: 'number', description: '触发时间戳' },
      { label: 'triggerType', type: 'string', description: '触发类型' },
      { label: 'executionId', type: 'string', description: '执行ID' }
    ],

    currency: [
      {
        label: 'currencies',
        type: 'array',
        description: '币种列表',
        children: [
          { label: '[].code', type: 'string', description: '币种代码' },
          { label: '[].name', type: 'string', description: '币种名称' }
        ]
      }
    ],

    market: [
      {
        label: 'klines',
        type: 'object',
        description: 'K线数据',
        children: [
          { label: '[symbol]', type: 'array', description: 'K线数组' }
        ]
      },
      { label: 'interval', type: 'string', description: '时间周期' },
      { label: 'count', type: 'number', description: 'K线数量' }
    ],

    account: [
      {
        label: 'balances',
        type: 'array',
        description: '余额列表',
        children: [
          { label: '[].asset', type: 'string', description: '资产' },
          { label: '[].free', type: 'number', description: '可用数量' },
          { label: '[].locked', type: 'number', description: '冻结数量' }
        ]
      }
    ],

    indicator: [
      {
        label: 'indicators',
        type: 'array',
        description: '指标结果',
        children: [
          { label: '[].type', type: 'string', description: '指标类型' },
          { label: '[].value', type: 'object', description: '指标值' }
        ]
      }
    ],

    strategy: [
      { label: 'signals', type: 'array', description: '交易信号' },
      { label: 'strategyType', type: 'string', description: '策略类型' }
    ],

    analysis: [
      { label: 'analysis', type: 'string', description: 'AI分析结果' },
      { label: 'model', type: 'string', description: '使用模型' }
    ],

    trade: [
      { label: 'orderId', type: 'string', description: '订单ID' },
      { label: 'symbol', type: 'string', description: '交易对' },
      { label: 'action', type: 'string', description: '交易动作' },
      { label: 'quantity', type: 'number', description: '数量' },
      { label: 'status', type: 'string', description: '订单状态' }
    ],

    condition: [
      { label: 'result', type: 'boolean', description: '条件结果' },
      { label: 'matchedCondition', type: 'string', description: '匹配的条件' }
    ],

    loop: [
      { label: 'loopCount', type: 'number', description: '循环次数' },
      { label: 'currentIndex', type: 'number', description: '当前索引' },
      { label: 'currentData', type: 'array', description: '当前数据' }
    ]
  }

  return schemas[nodeType] || []
}

// 根据上游节点类型推断输出数据结构
export function inferOutputFromNodeType(nodeType: string, customName: string): Record<string, unknown> {
  const mockOutputs: Record<string, Record<string, unknown>> = {
    start: {
      triggered: true,
      triggeredAt: Date.now(),
      triggerType: 'manual',
      executionId: 'mock_exec_xxx'
    },
    currency: {
      currencies: []
    },
    market: {
      klines: {},
      interval: '1h',
      count: 0
    },
    account: {
      balances: [
        { asset: 'BTC', free: 0.5, locked: 0 },
        { asset: 'ETH', free: 2.0, locked: 0.1 }
      ]
    },
    indicator: {
      indicators: [
        { type: 'rsi', value: { rsi: 65.5 } },
        { type: 'macd', value: { macd: 0.5, signal: 0.3, histogram: 0.2 } }
      ]
    },
    strategy: {
      signals: [
        { action: 'buy', confidence: 0.75, reason: 'RSI oversold' }
      ],
      strategyType: 'momentum'
    },
    analysis: {
      analysis: 'Based on current market data, consider buying...',
      model: 'mock-model'
    },
    trade: {
      orderId: 'mock_order_xxx',
      symbol: 'BTC-USDT',
      action: 'buy',
      quantity: 0.1,
      status: 'filled'
    },
    condition: {
      result: true,
      matchedCondition: '{{RSI.rsi}} > 30'
    },
    loop: {
      loopCount: 5,
      currentIndex: 1,
      currentData: []
    }
  }

  const baseOutput = mockOutputs[nodeType]
  if (!baseOutput) return {}

  // 用 customName 作为 key
  return baseOutput
}
