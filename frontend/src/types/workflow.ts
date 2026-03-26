export type WorkflowNodeType =
  | 'currency'
  | 'market'
  | 'account'
  | 'indicator'
  | 'strategy'
  | 'analysis'
  | 'trade'
  | 'condition'
  | 'loop'

export type WorkflowNodeCategory = 'currency' | 'data' | 'strategy' | 'ai' | 'tool'

export type WorkflowPortDirection = 'input' | 'output'

export interface WorkflowNodePoint {
  x: number
  y: number
}

export interface WorkflowConnectionDraft {
  fromNodeId: string
  fromPortId: string
  point: WorkflowNodePoint
}

export interface WorkflowConnectionTarget {
  nodeId: string
  portId: string
}

export interface WorkflowPort {
  id: string
  label: string
  direction: WorkflowPortDirection
}

export type WorkflowNodeStatus = 'enabled' | 'disabled'

export interface WorkflowNodeSize {
  width: number
  height: number
}

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

export type WorkflowEdgeVisualState = 'default' | 'hover' | 'active' | 'dimmed'

export interface WorkflowEdge {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
  visualState?: WorkflowEdgeVisualState
}

export interface WorkflowNodeTemplate {
  type: WorkflowNodeType
  category: WorkflowNodeCategory
  label: string
  inputs: WorkflowPort[]
  outputs: WorkflowPort[]
}

export interface WorkflowPaletteGroup {
  category: WorkflowNodeCategory
  label: string
  items: WorkflowNodeTemplate[]
}

export interface WorkflowNodeState {
  nodes: WorkflowNode[]
  selectedNodeId: string | null
  draggingNodeId: string | null
}

export interface WorkflowEdgeState {
  edges: WorkflowEdge[]
  activeEdgeId: string | null
}
