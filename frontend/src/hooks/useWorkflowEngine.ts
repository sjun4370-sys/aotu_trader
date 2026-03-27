import { useCallback } from 'react'
import type { WorkflowNode, WorkflowEdge } from '../types/workflow'
import type { NodeExecutionResult } from '../types/workflowExecution'
import { useNodeExecutor } from './useNodeExecutor'

export function buildDependencyGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
  for (const node of nodes) {
    graph.set(node.id, [])
  }
  
  for (const edge of edges) {
    const downstream = graph.get(edge.fromNodeId)
    if (downstream) {
      downstream.push(edge.toNodeId)
    }
  }
  
  return graph
}

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const inDegree = new Map<string, number>()
  const adjacencyList = new Map<string, string[]>()
  
  for (const node of nodes) {
    inDegree.set(node.id, 0)
    adjacencyList.set(node.id, [])
  }
  
  for (const edge of edges) {
    const neighbors = adjacencyList.get(edge.fromNodeId)
    if (neighbors) {
      neighbors.push(edge.toNodeId)
    }
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) || 0) + 1)
  }
  
  const queue: string[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId)
    }
  }
  
  const sorted: WorkflowNode[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodeMap.get(nodeId)
    if (node) {
      sorted.push(node)
    }
    
    const neighbors = adjacencyList.get(nodeId)
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          queue.push(neighbor)
        }
      }
    }
  }
  
  return sorted
}

function getNodeById(nodeId: string, nodes: WorkflowNode[]): WorkflowNode | undefined {
  return nodes.find(n => n.id === nodeId)
}

function collectInputs(
  targetNode: WorkflowNode,
  edges: WorkflowEdge[],
  previousOutputs: Map<string, Record<string, unknown>>,
  nodes: WorkflowNode[]
): Record<string, Record<string, unknown>> {
  const inputs: Record<string, Record<string, unknown>> = {}
  
  for (const edge of edges) {
    if (edge.toNodeId === targetNode.id) {
      const sourceNode = getNodeById(edge.fromNodeId, nodes)
      if (sourceNode && previousOutputs.has(sourceNode.customName)) {
        inputs[sourceNode.customName] = previousOutputs.get(sourceNode.customName)!
      }
    }
  }
  
  return inputs
}

export function useWorkflowEngine() {
  const { executeNode } = useNodeExecutor()
  
  const runWorkflow = useCallback(async (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    onNodeStart: (nodeId: string) => void,
    onNodeComplete: (result: NodeExecutionResult) => void,
    onEdgeHighlight: (edgeId: string) => void,
    onError: (error: string) => void
  ): Promise<Map<string, NodeExecutionResult>> => {
    const sortedNodes = topologicalSort(nodes, edges)
    const nodeResults = new Map<string, NodeExecutionResult>()
    const previousOutputs = new Map<string, Record<string, unknown>>()
    
    for (const node of sortedNodes) {
      const inputs = collectInputs(node, edges, previousOutputs, nodes)
      
      onNodeStart(node.id)
      
      edges
        .filter(e => e.fromNodeId === node.id)
        .forEach(e => onEdgeHighlight(e.id))
      
      const result = await executeNode({
        nodeId: node.id,
        customName: node.customName,
        config: { ...node.config, nodeType: node.type },
        inputs,
        previousOutputs: Object.fromEntries(previousOutputs)
      })
      
      nodeResults.set(node.id, result)
      if (result.output) {
        previousOutputs.set(node.customName, result.output)
      }
      
      onNodeComplete(result)
      
      if (result.status === 'error') {
        onError(result.error || 'Node execution failed')
        break
      }
    }
    
    return nodeResults
  }, [executeNode])
  
  return { runWorkflow }
}
