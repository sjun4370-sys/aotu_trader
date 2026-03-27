export type WorkflowExecutionStatus = 
  | 'idle' 
  | 'running' 
  | 'success' 
  | 'error' 
  | 'skipped'

export interface NodeExecutionResult {
  nodeId: string
  customName: string
  status: WorkflowExecutionStatus
  output: Record<string, unknown> | null
  error: string | null
  startTime: number
  endTime?: number
}

export interface WorkflowExecutionState {
  executionId: string | null
  status: 'idle' | 'running' | 'completed' | 'error'
  nodeResults: Map<string, NodeExecutionResult>
  currentNodeId: string | null
  error: string | null
}

export interface NodeExecutorContext {
  nodeId: string
  customName: string
  config: Record<string, unknown>
  inputs: Record<string, Record<string, unknown>>
  previousOutputs: Map<string, Record<string, unknown>>
}
