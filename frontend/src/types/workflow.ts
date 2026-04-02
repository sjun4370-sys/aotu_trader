/**
 * 工作流节点类型
 */
export type WorkflowNodeType =
  // 触发器
  | 'start'
  // OKX数据节点
  | 'okx_ticker' | 'okx_candles' | 'okx_orderbook' | 'okx_account' | 'okx_positions'
  // 技术指标节点
  | 'rsi' | 'macd' | 'bollinger' | 'ma'
  // AI节点
  | 'llm_analysis' | 'signal_generator'
  // 风控节点
  | 'risk_check' | 'stop_loss' | 'take_profit' | 'position_sizing'
  // 交易节点
  | 'create_order' | 'monitor_order' | 'cancel_order' | 'query_position'
  // 逻辑节点
  | 'condition' | 'loop'
  // 向后兼容
  | 'currency' | 'market' | 'account' | 'indicator' | 'strategy' | 'analysis' | 'trade'

/**
 * 工作流节点分类
 */
export type WorkflowNodeCategory =
  | 'trigger'   // 触发器
  | 'data'      // 市场数据 (OKX)
  | 'indicator'  // 技术指标
  | 'ai'        // AI分析
  | 'risk'      // 风险控制
  | 'trade'     // 交易执行
  | 'logic'     // 逻辑控制
  // 向后兼容
  | 'currency' | 'strategy' | 'tool'

/**
 * 币种数据
 */
export interface CurrencyItem {
  code: string
  name: string
}

export interface CurrencyData {
  currencies: CurrencyItem[]
}

/**
 * 端口方向
 */
export type WorkflowPortDirection = 'input' | 'output'

/**
 * 节点坐标点
 */
export interface WorkflowNodePoint {
  x: number
  y: number
}

/**
 * 连接线起点拖拽状态
 */
export interface WorkflowConnectionDraft {
  fromNodeId: string
  fromPortId: string
  point: WorkflowNodePoint
}

/**
 * 连接线目标节点
 */
export interface WorkflowConnectionTarget {
  nodeId: string
  portId: string
}

/**
 * 工作流端口
 */
export interface WorkflowPort {
  id: string
  label: string
  direction: WorkflowPortDirection
}

/**
 * 节点状态
 */
export type WorkflowNodeStatus = 'enabled' | 'disabled'

/**
 * 节点尺寸
 */
export interface WorkflowNodeSize {
  width: number
  height: number
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  customName: string
  category: WorkflowNodeCategory
  label: string
  position: WorkflowNodePoint
  size: WorkflowNodeSize
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
  config: Record<string, unknown>
  status: WorkflowNodeStatus
}

/**
 * 连接线视觉状态
 */
export type WorkflowEdgeVisualState = 'default' | 'hover' | 'active' | 'dimmed'

/**
 * 工作流连接线
 */
export interface WorkflowEdge {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
  visualState?: WorkflowEdgeVisualState
}

/**
 * 工作流节点模板(用于调色板)
 */
export interface WorkflowNodeTemplate {
  type: WorkflowNodeType
  category: WorkflowNodeCategory
  label: string
  icon?: React.ComponentType<{ className?: string }>
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
}

/**
 * 调色板分组
 */
export interface WorkflowPaletteGroup {
  category: WorkflowNodeCategory
  label: string
  items: WorkflowNodeTemplate[]
}

/**
 * 节点状态(运行时)
 */
export interface WorkflowNodeState {
  nodes: WorkflowNode[]
  selectedNodeId: string | null
  draggingNodeId: string | null
}

/**
 * 连接线状态(运行时)
 */
export interface WorkflowEdgeState {
  edges: WorkflowEdge[]
  activeEdgeId: string | null
}

// ==================== 节点执行输出类型 ====================

/**
 * 节点输出数据（统一格式）
 */
export interface NodeOutput {
  success: boolean
  node: { id: string; type: string }
  data: NodeData
  timestamp: number
  error?: string
}

/**
 * 节点数据类型联合
 */
export type NodeData =
  | { type: 'okx_ticker'; inst_id: string; last: number; bid: number; ask: number; open_24h: string; high_24h: string; low_24h: string; vol_24h: string; change_24h: string }
  | { type: 'okx_candles'; inst_id: string; bar: string; candles: unknown[]; closes: number[]; count: number; latest_close: number }
  | { type: 'okx_orderbook'; inst_id: string; bids: [number, number][]; asks: [number, number][]; best_bid: number; best_ask: number }
  | { type: 'okx_account'; inst_id: string; balances: { asset: string; free: number; locked: number }[]; equity: number }
  | { type: 'okx_positions'; inst_id: string; positions: unknown[]; total_upl: number }
  | { type: 'rsi'; inst_id: string; period: number; rsi: number; signal: string; trend: string; history: number[] }
  | { type: 'macd'; inst_id: string; fast: number; slow: number; signal: number; macd: number; histogram: number; crossover: string }
  | { type: 'bollinger'; inst_id: string; period: number; stdDev: number; upper: number; middle: number; lower: number }
  | { type: 'ma'; inst_id: string; period: number; ma_type: string; ma: number; trend: string }
  | { type: 'llm_analysis'; provider: string; model: string; analysis: string; sentiment: string; recommendation: string; confidence: number }
  | { type: 'signal_generator'; action: string; confidence: number; reason: string }
  | { type: 'risk_check'; approved: boolean; reason?: string }
  | { type: 'stop_loss'; triggered: boolean; reason?: string }
  | { type: 'take_profit'; triggered: boolean; reason?: string }
  | { type: 'position_sizing'; qty: number; value: number; reason?: string }
  | { type: 'create_order'; order_id: string; symbol: string; side: string; qty: number; price: number; status: string }
  | { type: 'monitor_order'; status: string; filled_qty: number; avg_price?: number }
  | { type: 'cancel_order'; success: boolean; reason?: string }
  | { type: 'query_position'; positions: unknown[]; total_upl: number }
  | { type: 'condition'; condition: string; result: boolean }
  | { type: 'loop'; loop_type: string; count: number; iterations: unknown[]; completed: boolean }
  | { type: 'start'; triggered: boolean; trigger_type: string; execution_id: string }
  | { type: 'unknown'; [key: string]: unknown }

// ==================== 工作流管理新增类型 ====================

/**
 * 工作流运行状态
 */
export type WorkflowRuntimeStatus = 'idle' | 'running' | 'failed' | 'stopped'

/**
 * 触发方式
 */
export type WorkflowTriggerMode = 'manual' | 'scheduled' | 'webhook'

/**
 * 工作流列表项（用于列表展示）
 */
export interface WorkflowListItem {
  id: string
  name: string
  description?: string
  status: WorkflowRuntimeStatus
  last_run_at?: string
  trigger_mode?: WorkflowTriggerMode
  created_at: string
  updated_at: string
}

/**
 * 完整工作流（包含节点和连线）
 */
export interface Workflow extends WorkflowListItem {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * 创建工作流请求
 */
export interface CreateWorkflowRequest {
  name: string
  description?: string
  trigger_mode?: WorkflowTriggerMode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/**
 * 更新工作流请求
 */
export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  trigger_mode?: WorkflowTriggerMode
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
}

/**
 * 工作流列表响应
 */
export interface WorkflowListApiResponse {
  workflows: WorkflowListItem[]
  total: number
  page: number
  page_size: number
}

/**
 * 运行工作流响应
 */
export interface RunWorkflowResponse {
  success: boolean
  message: string
  workflow_id: string
  status?: WorkflowRuntimeStatus
  results?: Array<{
    node_id: string
    status: string
    output: Record<string, unknown> | null
    error: string | null
    start_time: string | null
    end_time: string | null
  }>
}

/**
 * 停止工作流响应
 */
export interface StopWorkflowResponse {
  success: boolean
  message: string
  workflow_id: string
  status: WorkflowRuntimeStatus
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number
  page_size?: number
}

/**
 * 工作流筛选参数
 */
export interface WorkflowFilterParams extends PaginationParams {
  status?: WorkflowRuntimeStatus
  search?: string
}
