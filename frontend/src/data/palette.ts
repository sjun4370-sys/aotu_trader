import type {
  WorkflowNodeCategory,
  WorkflowNodeTemplate,
  WorkflowPaletteGroup,
  WorkflowPortDirection
} from '../types/workflow'

const createPort = (id: string, label: string, direction: WorkflowPortDirection) => ({
  id,
  label,
  direction
})

// ==================== 基础节点 ====================

const START_NODE: WorkflowNodeTemplate = {
  type: 'start',
  category: 'trigger',
  label: '开始',
  inputs: [],
  outputs: [createPort('trigger', '触发', 'output')]
}

// ==================== OKX数据节点（真实API）====================

const OKX_TICKER_NODE: WorkflowNodeTemplate = {
  type: 'okx_ticker',
  category: 'data',
  label: '📊 OKX行情',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('ticker', '行情数据', 'output'),
    createPort('price', '当前价格', 'output')
  ]
}

const OKX_CANDLES_NODE: WorkflowNodeTemplate = {
  type: 'okx_candles',
  category: 'data',
  label: '📈 OKX K线',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('candles', 'K线数据', 'output'),
    createPort('closes', '收盘价数组', 'output')
  ]
}

const OKX_ORDERBOOK_NODE: WorkflowNodeTemplate = {
  type: 'okx_orderbook',
  category: 'data',
  label: '📖 OKX订单簿',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('orderbook', '订单簿', 'output'),
    createPort('spread', '价差', 'output')
  ]
}

const OKX_ACCOUNT_NODE: WorkflowNodeTemplate = {
  type: 'okx_account',
  category: 'data',
  label: '💰 OKX账户',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('balance', '账户余额', 'output'),
    createPort('equity', '总权益', 'output')
  ]
}

const OKX_POSITIONS_NODE: WorkflowNodeTemplate = {
  type: 'okx_positions',
  category: 'data',
  label: '📋 OKX持仓',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('positions', '持仓列表', 'output'),
    createPort('total_upl', '总盈亏', 'output')
  ]
}

// ==================== 技术指标节点（TA-Lib）====================

const RSI_NODE: WorkflowNodeTemplate = {
  type: 'rsi',
  category: 'indicator',
  label: '📉 RSI指标',
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [
    createPort('rsi', 'RSI值', 'output'),
    createPort('signal', '信号', 'output')
  ]
}

const MACD_NODE: WorkflowNodeTemplate = {
  type: 'macd',
  category: 'indicator',
  label: '📊 MACD指标',
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [
    createPort('macd', 'MACD线', 'output'),
    createPort('signal', '信号线', 'output'),
    createPort('histogram', '柱状图', 'output')
  ]
}

const BOLLINGER_NODE: WorkflowNodeTemplate = {
  type: 'bollinger',
  category: 'indicator',
  label: '🎯 布林带',
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [
    createPort('upper', '上轨', 'output'),
    createPort('middle', '中轨', 'output'),
    createPort('lower', '下轨', 'output')
  ]
}

const MA_NODE: WorkflowNodeTemplate = {
  type: 'ma',
  category: 'indicator',
  label: '📈 移动平均线',
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [
    createPort('ma', '均线值', 'output'),
    createPort('trend', '趋势', 'output')
  ]
}

// ==================== AI节点（真实LLM调用）====================

const LLM_ANALYSIS_NODE: WorkflowNodeTemplate = {
  type: 'llm_analysis',
  category: 'ai',
  label: '🤖 AI市场分析',
  inputs: [
    createPort('ticker', '行情数据', 'input'),
    createPort('indicator', '指标数据', 'input')
  ],
  outputs: [
    createPort('analysis', '分析报告', 'output'),
    createPort('sentiment', '情绪', 'output'),
    createPort('recommendation', '建议', 'output')
  ]
}

const SIGNAL_GENERATOR_NODE: WorkflowNodeTemplate = {
  type: 'signal_generator',
  category: 'ai',
  label: '⚡ 信号生成器',
  inputs: [
    createPort('analysis', 'AI分析', 'input'),
    createPort('indicator', '技术指标', 'input')
  ],
  outputs: [
    createPort('signal', '交易信号', 'output'),
    createPort('confidence', '置信度', 'output')
  ]
}

// ==================== 风控节点（真实风控）====================

const RISK_CHECK_NODE: WorkflowNodeTemplate = {
  type: 'risk_check',
  category: 'risk',
  label: '🛡️ 风控检查',
  inputs: [createPort('signal', '交易信号', 'input')],
  outputs: [
    createPort('approved', '通过', 'output'),
    createPort('rejected', '拒绝', 'output')
  ]
}

const STOP_LOSS_NODE: WorkflowNodeTemplate = {
  type: 'stop_loss',
  category: 'risk',
  label: '🛑 止损检查',
  inputs: [
    createPort('position', '持仓', 'input'),
    createPort('price', '当前价格', 'input')
  ],
  outputs: [
    createPort('triggered', '已触发', 'output'),
    createPort('hold', '持有', 'output')
  ]
}

const TAKE_PROFIT_NODE: WorkflowNodeTemplate = {
  type: 'take_profit',
  category: 'risk',
  label: '✅ 止盈检查',
  inputs: [
    createPort('position', '持仓', 'input'),
    createPort('price', '当前价格', 'input')
  ],
  outputs: [
    createPort('triggered', '已触发', 'output'),
    createPort('hold', '持有', 'output')
  ]
}

const POSITION_SIZING_NODE: WorkflowNodeTemplate = {
  type: 'position_sizing',
  category: 'risk',
  label: '⚖️ 仓位计算',
  inputs: [
    createPort('signal', '交易信号', 'input'),
    createPort('balance', '账户余额', 'input')
  ],
  outputs: [
    createPort('qty', '数量', 'output'),
    createPort('value', '价值', 'output')
  ]
}

// ==================== 交易执行节点（真实下单）====================

const CREATE_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'create_order',
  category: 'trade',
  label: '📝 创建订单',
  inputs: [
    createPort('signal', '交易信号', 'input'),
    createPort('risk_check', '风控结果', 'input')
  ],
  outputs: [
    createPort('order', '订单', 'output'),
    createPort('order_id', '订单ID', 'output')
  ]
}

const MONITOR_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'monitor_order',
  category: 'trade',
  label: '👁️ 监控订单',
  inputs: [createPort('order', '订单', 'input')],
  outputs: [
    createPort('filled', '已成交', 'output'),
    createPort('partial', '部分成交', 'output'),
    createPort('timeout', '超时', 'output')
  ]
}

const CANCEL_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'cancel_order',
  category: 'trade',
  label: '❌ 取消订单',
  inputs: [createPort('order', '订单', 'input')],
  outputs: [createPort('result', '结果', 'output')]
}

const QUERY_POSITION_NODE: WorkflowNodeTemplate = {
  type: 'query_position',
  category: 'trade',
  label: '🔍 查询持仓',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [
    createPort('positions', '持仓列表', 'output'),
    createPort('total_upl', '总盈亏', 'output')
  ]
}

// ==================== 逻辑节点 ====================

const CONDITION_NODE: WorkflowNodeTemplate = {
  type: 'condition',
  category: 'logic',
  label: '🔀 条件判断',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [
    createPort('true', '通过', 'output'),
    createPort('false', '失败', 'output')
  ]
}

const LOOP_NODE: WorkflowNodeTemplate = {
  type: 'loop',
  category: 'logic',
  label: '🔄 循环',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [createPort('out', '输出', 'output')]
}

// ==================== 导出所有节点 ====================

export const WORKFLOW_NODE_TEMPLATES: WorkflowNodeTemplate[] = [
  // 触发器
  START_NODE,
  
  // OKX数据
  OKX_TICKER_NODE,
  OKX_CANDLES_NODE,
  OKX_ORDERBOOK_NODE,
  OKX_ACCOUNT_NODE,
  OKX_POSITIONS_NODE,
  
  // 技术指标
  RSI_NODE,
  MACD_NODE,
  BOLLINGER_NODE,
  MA_NODE,
  
  // AI
  LLM_ANALYSIS_NODE,
  SIGNAL_GENERATOR_NODE,
  
  // 风控
  RISK_CHECK_NODE,
  STOP_LOSS_NODE,
  TAKE_PROFIT_NODE,
  POSITION_SIZING_NODE,
  
  // 交易
  CREATE_ORDER_NODE,
  MONITOR_ORDER_NODE,
  CANCEL_ORDER_NODE,
  QUERY_POSITION_NODE,
  
  // 逻辑
  CONDITION_NODE,
  LOOP_NODE
]

const groupByCategory = (
  category: WorkflowNodeCategory,
  label: string,
  items: WorkflowNodeTemplate[]
): WorkflowPaletteGroup => ({
  category,
  label,
  items
})

export const WORKFLOW_PALETTE_GROUPS: WorkflowPaletteGroup[] = [
  groupByCategory('trigger', '▶️ 触发器', [START_NODE]),
  groupByCategory('data', '📡 市场数据 (OKX)', [
    OKX_TICKER_NODE,
    OKX_CANDLES_NODE,
    OKX_ORDERBOOK_NODE,
    OKX_ACCOUNT_NODE,
    OKX_POSITIONS_NODE
  ]),
  groupByCategory('indicator', '📊 技术指标 (TA-Lib)', [
    RSI_NODE,
    MACD_NODE,
    BOLLINGER_NODE,
    MA_NODE
  ]),
  groupByCategory('ai', '🤖 AI分析', [
    LLM_ANALYSIS_NODE,
    SIGNAL_GENERATOR_NODE
  ]),
  groupByCategory('risk', '🛡️ 风险控制', [
    RISK_CHECK_NODE,
    STOP_LOSS_NODE,
    TAKE_PROFIT_NODE,
    POSITION_SIZING_NODE
  ]),
  groupByCategory('trade', '💰 交易执行', [
    CREATE_ORDER_NODE,
    MONITOR_ORDER_NODE,
    CANCEL_ORDER_NODE,
    QUERY_POSITION_NODE
  ]),
  groupByCategory('logic', '🔀 逻辑控制', [
    CONDITION_NODE,
    LOOP_NODE
  ])
]

// ==================== 向后兼容 ====================

// 旧节点映射到新节点（兼容现有工作流）
export const NODE_TYPE_COMPATIBILITY: Record<string, string> = {
  'market': 'okx_ticker',
  'account': 'okx_account',
  'indicator': 'rsi',
  'analysis': 'llm_analysis',
  'trade': 'create_order',
  'currency': 'okx_ticker'
}
