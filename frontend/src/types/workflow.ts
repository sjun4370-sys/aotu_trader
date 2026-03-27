/**
 * 工作流节点类型
 */
export type WorkflowNodeType = 'currency' | 'market' | 'account' | 'indicator' | 'strategy' | 'analysis' | 'trade' | 'condition' | 'loop'

/**
 * 工作流节点分类
 */
export type WorkflowNodeCategory = 'currency' | 'data' | 'strategy' | 'ai' | 'tool'

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
