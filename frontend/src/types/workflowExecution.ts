export type WorkflowExecutionStatus = 
  | 'idle' 
  | 'running' 
  | 'completed' 
  | 'success' 
  | 'error' 
  | 'skipped'

export interface NodeExecutionResult {
  nodeId: string
  customName: string
  status: WorkflowExecutionStatus
  output: Record<string, unknown> | null
  error: string | null
  startTime?: number
  endTime?: number
}

export interface WorkflowExecutionState {
  executionId: string | null
  status: WorkflowExecutionStatus
  nodeResults: Record<string, NodeExecutionResult>
  currentNodeId: string | null
  error: string | null
}

export interface NodeExecutorContext {
  nodeId: string
  customName: string
  config: Record<string, unknown>
  inputs: Record<string, Record<string, unknown>>
  previousOutputs: Record<string, Record<string, unknown>>
}
