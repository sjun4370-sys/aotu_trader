import { useState } from 'react'
import type { WorkflowEdge, WorkflowNode, WorkflowNodeStatus } from '../../types/workflow'
import { MultiSelect, type CurrencyOption } from '../ui/multi-select'
import { MOCK_CURRENCIES } from '../../data/currencies'
import styles from './NodeInspector.module.css'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NodeInspectorProps {
  node: WorkflowNode | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  onClose: () => void
  onDelete?: () => void
  onApply?: (payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  currency: '货币',
  data: '数据',
  strategy: '策略',
  ai: 'AI',
  tool: '工具'
}

const STATUS_OPTIONS: { value: WorkflowNodeStatus; label: string }[] = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' }
]

function NodeInspectorContent({
  node,
  nodes,
  edges,
  onClose,
  onDelete,
  onApply
}: {
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  onClose: () => void
  onDelete?: () => void
  onApply?: (payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => void
}) {
  const [configText, setConfigText] = useState(() => JSON.stringify(node.config, null, 2))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const [status, setStatus] = useState<WorkflowNodeStatus>(() => node.status)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(
    () => (node.config.currencies as string[]) ?? []
  )

  const handleApply = () => {
    try {
      const parsed = JSON.parse(configText) as Record<string, unknown>
      if (node.type === 'currency') {
        parsed.currencies = selectedCurrencies
      }
      setErrorMessage('')
      onApply?.({ config: parsed, status })
    } catch {
      setErrorMessage('JSON 格式无效，请检查后再应用')
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.title}>{node.label}</span>
          <span className={styles.categoryBadge} data-category={node.category}>
            {CATEGORY_LABELS[node.category] ?? node.category}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭检查器">
          ×
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>基本信息</h3>
          <dl className={styles.infoGrid}>
            <dt className={styles.infoLabel}>状态</dt>
            <dd className={styles.infoValue}>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as WorkflowNodeStatus)}
              >
                <SelectTrigger className={styles.statusSelectTrigger}>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent className={styles.statusSelectContent}>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className={opt.value === 'enabled' ? styles.statusItemEnabled : styles.statusItemDisabled}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>端口信息</h3>
          {node.inputs.length > 0 ? (
            <div className={styles.portGroup}>
              <p className={styles.portGroupLabel}>输入端口</p>
              {node.inputs.map((port) => {
                const sourceNodeIds = edges
                  .filter((e) => e.toNodeId === node.id && e.toPortId === port.id)
                  .map((e) => e.fromNodeId)
                const sourceLabels = sourceNodeIds.map((id) => nodeById.get(id)?.label ?? id)
                return (
                  <div key={port.id} className={styles.portRow}>
                    <span className={styles.portName}>{port.label}</span>
                    <span className={styles.portBadge} data-direction={port.direction}>
                      输入
                    </span>
                    {sourceLabels.length > 0 && (
                      <span className={styles.portSources}>
                        来源: {sourceLabels.join(', ')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
          {node.outputs.length > 0 ? (
            <div className={styles.portGroup}>
              <p className={styles.portGroupLabel}>输出端口</p>
              {node.outputs.map((port) => (
                <div key={port.id} className={styles.portRow}>
                  <span className={styles.portName}>{port.label}</span>
                  <span className={styles.portBadge} data-direction={port.direction}>
                    输出
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {node.inputs.length === 0 && node.outputs.length === 0 ? (
            <p className={styles.emptyPorts}>无端口</p>
          ) : null}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>配置</h3>
          {node.type === 'currency' ? (
            <div className={styles.currencyConfig}>
              <p className={styles.configLabel}>选择币种</p>
              <MultiSelect
                options={MOCK_CURRENCIES as CurrencyOption[]}
                value={selectedCurrencies}
                onChange={setSelectedCurrencies}
                placeholder="搜索并选择币种..."
              />
            </div>
          ) : (
            <textarea
              className={styles.configTextarea}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder="{}"
              spellCheck={false}
            />
          )}
          {errorMessage ? (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>

      <footer className={styles.footer}>
        <button className={styles.btnApply} onClick={handleApply}>应用</button>
        <button className={styles.btnDelete} onClick={onDelete}>删除节点</button>
      </footer>
    </>
  )
}

export default function NodeInspector({ node, nodes, edges, onClose, onDelete, onApply }: NodeInspectorProps) {
  const isVisible = node !== null

  return (
    <div
      className={styles.panel}
      data-visible={isVisible}
      data-testid="node-inspector-panel"
    >
      {node ? (
        <NodeInspectorContent
          key={node.id}
          node={node}
          nodes={nodes}
          edges={edges}
          onClose={onClose}
          onDelete={onDelete}
          onApply={onApply}
        />
      ) : null}
    </div>
  )
}
