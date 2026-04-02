import type {
  WorkflowNodeCategory,
  WorkflowNodeTemplate,
  WorkflowPaletteGroup,
  WorkflowPortDirection
} from '../types/workflow'
import {
  Play,
  BarChart3,
  TrendingUp,
  Brain,
  Shield,
  GitBranch,
  RotateCw,
  Target,
  UserCircle,
  Wallet,
  List,
  CandlestickChart,
  BookOpen,
  Activity,
  Zap,
  Ban,
  Search,
  FileText,
  Eye,
  Scale
} from 'lucide-react'

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
  icon: Play,
  inputs: [],
  outputs: [createPort('trigger', '触发', 'output')]
}

const CURRENCY_NODE: WorkflowNodeTemplate = {
  type: 'currency',
  category: 'currency',
  label: '币种选择器',
  icon: Wallet,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('out', '币种', 'output')]
}

// ==================== OKX数据节点（真实API）====================

const OKX_TICKER_NODE: WorkflowNodeTemplate = {
  type: 'okx_ticker',
  category: 'data',
  label: 'OKX行情',
  icon: BarChart3,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('ticker', '行情数据', 'output')]
}

const OKX_CANDLES_NODE: WorkflowNodeTemplate = {
  type: 'okx_candles',
  category: 'data',
  label: 'OKX K线',
  icon: CandlestickChart,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('candles', 'K线数据', 'output')]
}

const OKX_ORDERBOOK_NODE: WorkflowNodeTemplate = {
  type: 'okx_orderbook',
  category: 'data',
  label: 'OKX订单簿',
  icon: BookOpen,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('orderbook', '订单簿', 'output')]
}

const OKX_ACCOUNT_NODE: WorkflowNodeTemplate = {
  type: 'okx_account',
  category: 'data',
  label: 'OKX账户',
  icon: UserCircle,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('account', '账户数据', 'output')]
}

const OKX_POSITIONS_NODE: WorkflowNodeTemplate = {
  type: 'okx_positions',
  category: 'data',
  label: 'OKX持仓',
  icon: List,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('positions', '持仓数据', 'output')]
}

// ==================== 技术指标节点（TA-Lib）====================

const RSI_NODE: WorkflowNodeTemplate = {
  type: 'rsi',
  category: 'indicator',
  label: 'RSI指标',
  icon: Activity,
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [createPort('rsi', 'RSI数据', 'output')]
}

const MACD_NODE: WorkflowNodeTemplate = {
  type: 'macd',
  category: 'indicator',
  label: 'MACD指标',
  icon: BarChart3,
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [createPort('macd', 'MACD数据', 'output')]
}

const BOLLINGER_NODE: WorkflowNodeTemplate = {
  type: 'bollinger',
  category: 'indicator',
  label: '布林带',
  icon: Target,
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [createPort('bollinger', '布林带数据', 'output')]
}

const MA_NODE: WorkflowNodeTemplate = {
  type: 'ma',
  category: 'indicator',
  label: '移动平均线',
  icon: TrendingUp,
  inputs: [createPort('candles', 'K线数据', 'input')],
  outputs: [createPort('ma', '均线数据', 'output')]
}

// ==================== AI节点（真实LLM调用）====================

const LLM_ANALYSIS_NODE: WorkflowNodeTemplate = {
  type: 'llm_analysis',
  category: 'ai',
  label: 'AI市场分析',
  icon: Brain,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('analysis', '分析结果', 'output')]
}

const SIGNAL_GENERATOR_NODE: WorkflowNodeTemplate = {
  type: 'signal_generator',
  category: 'ai',
  label: '信号生成器',
  icon: Zap,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('signal', '交易信号', 'output')]
}

// ==================== 风控节点（真实风控）====================

const RISK_CHECK_NODE: WorkflowNodeTemplate = {
  type: 'risk_check',
  category: 'risk',
  label: '风控检查',
  icon: Shield,
  inputs: [createPort('signal', '交易信号', 'input')],
  outputs: [createPort('result', '风控结果', 'output')]
}

const STOP_LOSS_NODE: WorkflowNodeTemplate = {
  type: 'stop_loss',
  category: 'risk',
  label: '止损检查',
  icon: Ban,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('result', '止损结果', 'output')]
}

const TAKE_PROFIT_NODE: WorkflowNodeTemplate = {
  type: 'take_profit',
  category: 'risk',
  label: '止盈检查',
  icon: Target,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('result', '止盈结果', 'output')]
}

const POSITION_SIZING_NODE: WorkflowNodeTemplate = {
  type: 'position_sizing',
  category: 'risk',
  label: '仓位计算',
  icon: Scale,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('position', '仓位数据', 'output')]
}

// ==================== 交易执行节点（真实下单）====================

const CREATE_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'create_order',
  category: 'trade',
  label: '创建订单',
  icon: FileText,
  inputs: [createPort('data', '输入数据', 'input')],
  outputs: [createPort('order', '订单', 'output')]
}

const MONITOR_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'monitor_order',
  category: 'trade',
  label: '监控订单',
  icon: Eye,
  inputs: [createPort('order', '订单', 'input')],
  outputs: [createPort('status', '订单状态', 'output')]
}

const CANCEL_ORDER_NODE: WorkflowNodeTemplate = {
  type: 'cancel_order',
  category: 'trade',
  label: '取消订单',
  icon: Ban,
  inputs: [createPort('order', '订单', 'input')],
  outputs: [createPort('result', '结果', 'output')]
}

const QUERY_POSITION_NODE: WorkflowNodeTemplate = {
  type: 'query_position',
  category: 'trade',
  label: '查询持仓',
  icon: Search,
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('positions', '持仓数据', 'output')]
}

// ==================== 逻辑节点 ====================

const CONDITION_NODE: WorkflowNodeTemplate = {
  type: 'condition',
  category: 'logic',
  label: '条件判断',
  icon: GitBranch,
  inputs: [createPort('in', '输入', 'input')],
  outputs: [
    createPort('true', '通过', 'output'),
    createPort('false', '失败', 'output')
  ]
}

const LOOP_NODE: WorkflowNodeTemplate = {
  type: 'loop',
  category: 'logic',
  label: '循环',
  icon: RotateCw,
  inputs: [createPort('in', '输入', 'input')],
  outputs: [createPort('out', '输出', 'output')]
}

// ==================== 导出所有节点 ====================

export const WORKFLOW_NODE_TEMPLATES: WorkflowNodeTemplate[] = [
  // 触发器
  START_NODE,

  // 币种选择器
  CURRENCY_NODE,

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
  groupByCategory('trigger', '触发器', [START_NODE]),
  groupByCategory('currency', '币种选择', [CURRENCY_NODE]),
  groupByCategory('data', '市场数据 (OKX)', [
    OKX_TICKER_NODE,
    OKX_CANDLES_NODE,
    OKX_ORDERBOOK_NODE,
    OKX_ACCOUNT_NODE,
    OKX_POSITIONS_NODE
  ]),
  groupByCategory('indicator', '技术指标 (TA-Lib)', [
    RSI_NODE,
    MACD_NODE,
    BOLLINGER_NODE,
    MA_NODE
  ]),
  groupByCategory('ai', 'AI分析', [
    LLM_ANALYSIS_NODE,
    SIGNAL_GENERATOR_NODE
  ]),
  groupByCategory('risk', '风险控制', [
    RISK_CHECK_NODE,
    STOP_LOSS_NODE,
    TAKE_PROFIT_NODE,
    POSITION_SIZING_NODE
  ]),
  groupByCategory('trade', '交易执行', [
    CREATE_ORDER_NODE,
    MONITOR_ORDER_NODE,
    CANCEL_ORDER_NODE,
    QUERY_POSITION_NODE
  ]),
  groupByCategory('logic', '逻辑控制', [
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
