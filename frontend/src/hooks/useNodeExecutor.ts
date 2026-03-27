import { useCallback } from 'react'
import { simulateNode } from '../services/nodeSimulator'
import type { NodeExecutorContext, NodeExecutionResult, WorkflowExecutionStatus } from '../types/workflowExecution'

export function useNodeExecutor() {
  const executeNode = useCallback(async (
    context: NodeExecutorContext
  ): Promise<NodeExecutionResult> => {
    const startTime = Date.now()
    
    try {
      const response = await simulateNode({
        nodeId: context.nodeId,
        nodeType: getNodeType(context.config),
        customName: context.customName,
        config: context.config,
        inputs: context.inputs
      })
      
      return {
        nodeId: context.nodeId,
        customName: context.customName,
        status: response.success ? 'success' as WorkflowExecutionStatus : 'error' as WorkflowExecutionStatus,
        output: response.output,
        error: response.error,
        startTime,
        endTime: Date.now()
      }
    } catch (error) {
      return {
        nodeId: context.nodeId,
        customName: context.customName,
        status: 'error' as WorkflowExecutionStatus,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime,
        endTime: Date.now()
      }
    }
  }, [])
  
  return { executeNode }
}

function getNodeType(config: Record<string, unknown>): string {
  return (config.nodeType as string) || 'unknown'
}
