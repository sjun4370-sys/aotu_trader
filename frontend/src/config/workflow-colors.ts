/**
 * 工作流节点分类配置
 * 所有节点类型的颜色、样式统一在此定义
 */
import type { WorkflowNodeCategory } from '../types/workflow'

export interface NodeCategoryConfig {
  /** 节点主色调 */
  nodeColor: string
  /** 连接线颜色 */
  edgeColor: string
  /** 选中高亮颜色 */
  highlightColor: string
  /** CSS 变量名（对应 tokens.css 中的 --wf-node-*） */
  cssVar: string
}

export const NODE_CATEGORY_CONFIG: Record<WorkflowNodeCategory, NodeCategoryConfig> = {
  trigger: {
    nodeColor: '#22c55e',
    edgeColor: '#22c55e',
    highlightColor: '#22c55e',
    cssVar: '--wf-node-trigger'
  },
  currency: {
    nodeColor: '#f59e0b',
    edgeColor: '#f59e0b',
    highlightColor: '#f59e0b',
    cssVar: '--wf-node-currency'
  },
  data: {
    nodeColor: '#38bdf8',
    edgeColor: '#38bdf8',
    highlightColor: '#38bdf8',
    cssVar: '--wf-node-data'
  },
  indicator: {
    nodeColor: '#a855f7',
    edgeColor: '#a855f7',
    highlightColor: '#a855f7',
    cssVar: '--wf-node-indicator'
  },
  ai: {
    nodeColor: '#fb7185',
    edgeColor: '#fb7185',
    highlightColor: '#fb7185',
    cssVar: '--wf-node-ai'
  },
  risk: {
    nodeColor: '#f59e0b',
    edgeColor: '#f59e0b',
    highlightColor: '#f59e0b',
    cssVar: '--wf-node-risk'
  },
  trade: {
    nodeColor: '#10b981',
    edgeColor: '#10b981',
    highlightColor: '#10b981',
    cssVar: '--wf-node-trade'
  },
  logic: {
    nodeColor: '#a855f7',
    edgeColor: '#a855f7',
    highlightColor: '#a855f7',
    cssVar: '--wf-node-logic'
  },
  // 向后兼容（无实际节点使用）
  strategy: {
    nodeColor: '#a855f7',
    edgeColor: '#a855f7',
    highlightColor: '#a855f7',
    cssVar: '--wf-node-strategy'
  },
  tool: {
    nodeColor: '#f59e0b',
    edgeColor: '#f59e0b',
    highlightColor: '#f59e0b',
    cssVar: '--wf-node-tool'
  }
}

/** 连接线颜色（供 EdgeLayer 使用） */
export const CATEGORY_EDGE_COLORS: Record<WorkflowNodeCategory, string> =
  Object.fromEntries(
    Object.entries(NODE_CATEGORY_CONFIG).map(([key, val]) => [key, val.edgeColor])
  ) as Record<WorkflowNodeCategory, string>
