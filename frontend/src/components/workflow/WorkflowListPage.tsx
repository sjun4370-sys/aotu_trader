/**
 * 工作流列表页面 - 新颖的卡片式布局
 * 使用现代深色主题设计
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { 
  WorkflowListItem, 
  WorkflowFilterParams,
  WorkflowRuntimeStatus 
} from '../../types/workflow'
import {
  getWorkflows,
  deleteWorkflow,
  runWorkflow,
  stopWorkflow,
} from '../../services/workflow'
import styles from './WorkflowListPage.module.css'

// 状态标签组件
function StatusBadge({ status }: { status: WorkflowRuntimeStatus }) {
  return (
    <span className={`${styles.statusBadge} ${styles[status]}`}>
      {status === 'running' ? (
        <>
          <span className={styles.pulseDot} />
          运行中
        </>
      ) : (
        '空闲'
      )}
    </span>
  )
}

// 工作流卡片组件
interface WorkflowCardProps {
  workflow: WorkflowListItem
  onRun: (id: string) => void
  onStop: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (workflow: WorkflowListItem) => void
}

function WorkflowCard({ workflow, onRun, onStop, onEdit, onDelete }: WorkflowCardProps) {
  const isRunning = workflow.status === 'running'
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '从未运行'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <h3>{workflow.name}</h3>
          {workflow.description && (
            <p className={styles.description}>{workflow.description}</p>
          )}
        </div>
        <StatusBadge status={workflow.status} />
      </div>
      
      <div className={styles.cardMeta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>上次运行</span>
          <span className={styles.metaValue}>{formatDate(workflow.last_run_at)}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>创建时间</span>
          <span className={styles.metaValue}>{formatDate(workflow.created_at)}</span>
        </div>
        {workflow.trigger_mode && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>触发方式</span>
            <span className={styles.metaValue}>{workflow.trigger_mode}</span>
          </div>
        )}
      </div>
      
      <div className={styles.cardActions}>
        {isRunning ? (
          <button
            className={`${styles.actionBtn} ${styles.stopBtn}`}
            onClick={() => onStop(workflow.id)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            停止
          </button>
        ) : (
          <button
            className={`${styles.actionBtn} ${styles.runBtn}`}
            onClick={() => onRun(workflow.id)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            运行
          </button>
        )}
        
        <button
          className={styles.actionBtn}
          onClick={() => onEdit(workflow.id)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          编辑
        </button>
        
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={() => onDelete(workflow)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          删除
        </button>
      </div>
    </div>
  )
}

// 删除确认弹窗
interface DeleteModalProps {
  workflow: WorkflowListItem | null
  onConfirm: () => void
  onCancel: () => void
}

function DeleteModal({ workflow, onConfirm, onCancel }: DeleteModalProps) {
  if (!workflow) return null
  
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>确认删除</h3>
        </div>
        <div className={styles.modalBody}>
          <p>确定要删除工作流 <strong>"{workflow.name}"</strong> 吗？</p>
          <p className={styles.warning}>此操作不可撤销。</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onCancel}>取消</button>
          <button className={styles.confirmBtn} onClick={onConfirm}>删除</button>
        </div>
      </div>
    </div>
  )
}

// 分页组件
interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  
  if (totalPages <= 1) return null
  
  return (
    <div className={styles.pagination}>
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={styles.pageBtn}
      >
        上一页
      </button>
      
      <span className={styles.pageInfo}>
        第 {page} 页 / 共 {totalPages} 页
      </span>
      
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={styles.pageBtn}
      >
        下一页
      </button>
    </div>
  )
}

// 主页面组件
export default function WorkflowListPage() {
  const navigate = useNavigate()
  
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  
  // 筛选和分页状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [statusFilter, setStatusFilter] = useState<WorkflowRuntimeStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 删除弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<WorkflowListItem | null>(null)
  
  // 加载工作流列表
  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params: WorkflowFilterParams = {
        page,
        page_size: pageSize,
      }
      
      if (statusFilter) params.status = statusFilter
      if (searchQuery) params.search = searchQuery
      
      const response = await getWorkflows(params)
      setWorkflows(response.workflows)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, searchQuery])
  
  // 初始加载和自动刷新
  useEffect(() => {
    loadWorkflows()
    
    // 每 5 秒刷新一次运行中的工作流状态
    const interval = setInterval(() => {
      const hasRunning = workflows.some(w => w.status === 'running')
      if (hasRunning) {
        loadWorkflows()
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [loadWorkflows, workflows])
  
  // 运行工作流
  const handleRun = async (id: string) => {
    try {
      await runWorkflow(id)
      loadWorkflows()
    } catch (err) {
      alert(err instanceof Error ? err.message : '运行失败')
    }
  }
  
  // 停止工作流
  const handleStop = async (id: string) => {
    try {
      await stopWorkflow(id)
      loadWorkflows()
    } catch (err) {
      alert(err instanceof Error ? err.message : '停止失败')
    }
  }
  
  // 编辑工作流
  const handleEdit = (id: string) => {
    navigate(`/workflow/${id}`)
  }
  
  // 新建工作流
  const handleCreate = () => {
    navigate('/workflow/new')
  }
  
  // 删除工作流
  const handleDelete = async () => {
    if (!deleteTarget) return
    
    try {
      await deleteWorkflow(deleteTarget.id)
      setDeleteTarget(null)
      loadWorkflows()
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }
  
  return (
    <div className={styles.container}>
      {/* 页面头部 */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>工作流管理</h1>
            <p className={styles.subtitle}>管理和运行您的自动化交易策略</p>
          </div>
          
          <button className={styles.createBtn} onClick={handleCreate}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            新建工作流
          </button>
        </div>
      </header>
      
      {/* 筛选栏 */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="搜索工作流..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && loadWorkflows()}
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as WorkflowRuntimeStatus)}
          className={styles.filterSelect}
        >
          <option value="">所有状态</option>
          <option value="idle">空闲</option>
          <option value="running">运行中</option>
        </select>
        
        <button className={styles.refreshBtn} onClick={loadWorkflows}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
          刷新
        </button>
      </div>
      
      {/* 工作流列表 */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : error ? (
          <div className={styles.error}>
            {error}
            <button onClick={loadWorkflows}>重试</button>
          </div>
        ) : workflows.length === 0 ? (
          <div className={styles.empty}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
            <h3>暂无工作流</h3>
            <p>点击"新建工作流"开始创建您的第一个自动化策略</p>
            <button className={styles.createBtn} onClick={handleCreate}>
              新建工作流
            </button>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {workflows.map(workflow => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onRun={handleRun}
                  onStop={handleStop}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
            
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      
      {/* 删除确认弹窗 */}
      <DeleteModal
        workflow={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
