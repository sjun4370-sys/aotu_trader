/**
 * 工作流节点类型
 */
export type WorkflowNodeType = 'start' | 'currency' | 'market' | 'account' | 'indicator' | 'strategy' | 'analysis' | 'trade' | 'condition' | 'loop'

/**
 * 工作流节点分类
 */
export type WorkflowNodeCategory = 'trigger' | 'currency' | 'data' | 'strategy' | 'ai' | 'tool'

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

// ==================== 工作流管理新增类型 ====================

/**
 * 工作流运行状态
 */
export type WorkflowRuntimeStatus = 'idle' | 'running'

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
  status: WorkflowRuntimeStatus
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
