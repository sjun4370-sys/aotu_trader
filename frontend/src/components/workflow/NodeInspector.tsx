import { useState } from 'react'
import type { WorkflowNode, WorkflowNodeStatus } from '../../types/workflow'
import styles from './NodeInspector.module.css'

interface NodeInspectorProps {
  node: WorkflowNode | null
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

const TYPE_LABELS: Record<string, string> = {
  currency: '货币节点',
  market: '市场数据',
  account: '账户信息',
  indicator: '技术指标',
  strategy: '策略节点',
  analysis: '分析节点',
  trade: '交易节点',
  condition: '条件节点',
  loop: '循环节点'
}

const STATUS_OPTIONS: { value: WorkflowNodeStatus; label: string }[] = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' }
]

function NodeInspectorContent({
  node,
  onClose,
  onDelete,
  onApply
}: {
  node: WorkflowNode
  onClose: () => void
  onDelete?: () => void
  onApply?: (payload: { config: Record<string, unknown>; status: WorkflowNodeStatus }) => void
}) {
  const [configText, setConfigText] = useState(() => JSON.stringify(node.config, null, 2))
  const [status, setStatus] = useState<WorkflowNodeStatus>(() => node.status)
  const [errorMessage, setErrorMessage] = useState('')

  const handleApply = () => {
    try {
      const parsed = JSON.parse(configText) as Record<string, unknown>
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
            <dt className={styles.infoLabel}>类型</dt>
            <dd className={styles.infoValue}>{TYPE_LABELS[node.type] ?? node.type}</dd>
            <dt className={styles.infoLabel}>分类</dt>
            <dd className={styles.infoValue}>{CATEGORY_LABELS[node.category] ?? node.category}</dd>
            <dt className={styles.infoLabel}>状态</dt>
            <dd className={styles.infoValue}>
              <select
                className={styles.statusSelect}
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkflowNodeStatus)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>端口信息</h3>
          {node.inputs.length > 0 ? (
            <div className={styles.portGroup}>
              <p className={styles.portGroupLabel}>输入端口</p>
              {node.inputs.map((port) => (
                <div key={port.id} className={styles.portRow}>
                  <span className={styles.portName}>{port.label}</span>
                  <span className={styles.portBadge} data-direction={port.direction}>
                    输入
                  </span>
                </div>
              ))}
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
          <textarea
            className={styles.configTextarea}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder="{}"
            spellCheck={false}
          />
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

export default function NodeInspector({ node, onClose, onDelete, onApply }: NodeInspectorProps) {
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
          onClose={onClose}
          onDelete={onDelete}
          onApply={onApply}
        />
      ) : null}
    </div>
  )
}
