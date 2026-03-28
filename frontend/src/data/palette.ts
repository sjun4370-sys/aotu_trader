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

const START_NODE: WorkflowNodeTemplate = {
  type: 'start',
  category: 'trigger',
  label: '开始',
  inputs: [],
  outputs: [createPort('trigger', '触发', 'output')]
}

const CURRENCY_NODE: WorkflowNodeTemplate = {
  type: 'currency',
  category: 'currency',
  label: '币种选择器',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('out', '币种', 'output')]
}

const MARKET_NODE: WorkflowNodeTemplate = {
  type: 'market',
  category: 'data',
  label: '获取市场数据',
  inputs: [createPort('currency', '币种', 'input')],
  outputs: [createPort('marketData', '市场数据', 'output')]
}

const ACCOUNT_NODE: WorkflowNodeTemplate = {
  type: 'account',
  category: 'data',
  label: '获取账户数据',
  inputs: [createPort('trigger', '触发', 'input')],
  outputs: [createPort('accountData', '账户数据', 'output')]
}

const INDICATOR_NODE: WorkflowNodeTemplate = {
  type: 'indicator',
  category: 'data',
  label: '计算技术指标',
  inputs: [createPort('marketData', '市场数据', 'input')],
  outputs: [createPort('indicatorData', '指标', 'output')]
}

const STRATEGY_NODE: WorkflowNodeTemplate = {
  type: 'strategy',
  category: 'strategy',
  label: '运行策略',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [createPort('signal', '信号', 'output')]
}

const ANALYSIS_NODE: WorkflowNodeTemplate = {
  type: 'analysis',
  category: 'ai',
  label: 'AI 交易分析',
  inputs: [createPort('signal', '信号', 'input')],
  outputs: [createPort('insight', '分析结果', 'output')]
}

const TRADE_NODE: WorkflowNodeTemplate = {
  type: 'trade',
  category: 'tool',
  label: '执行交易',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [createPort('result', '结果', 'output')]
}

const CONDITION_NODE: WorkflowNodeTemplate = {
  type: 'condition',
  category: 'tool',
  label: '条件器',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [
    createPort('true', '通过', 'output'),
    createPort('false', '失败', 'output')
  ]
}

const LOOP_NODE: WorkflowNodeTemplate = {
  type: 'loop',
  category: 'tool',
  label: '循环组件',
  inputs: [createPort('in', '输入', 'input')],
  outputs: [createPort('out', '输出', 'output')]
}

export const WORKFLOW_NODE_TEMPLATES: WorkflowNodeTemplate[] = [
  START_NODE,
  CURRENCY_NODE,
  MARKET_NODE,
  ACCOUNT_NODE,
  INDICATOR_NODE,
  STRATEGY_NODE,
  ANALYSIS_NODE,
  TRADE_NODE,
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
  groupByCategory('currency', '币种', [CURRENCY_NODE]),
  groupByCategory('data', '数据类', [MARKET_NODE, ACCOUNT_NODE, INDICATOR_NODE]),
  groupByCategory('strategy', '策略类', [STRATEGY_NODE]),
  groupByCategory('ai', 'AI分析', [ANALYSIS_NODE]),
  groupByCategory('tool', '工具类', [TRADE_NODE, CONDITION_NODE, LOOP_NODE])
]
