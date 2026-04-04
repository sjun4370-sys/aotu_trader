/**
 * 工作流 API 服务
 */

import type {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowListApiResponse,
  RunWorkflowResponse,
  StopWorkflowResponse,
  WorkflowFilterParams,
} from '../types/workflow'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * 通用请求封装
 */
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * 获取工作流列表
 */
export async function getWorkflows(
  params?: WorkflowFilterParams
): Promise<WorkflowListApiResponse> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.search) searchParams.set('search', params.search)

  const query = searchParams.toString()
  return request<WorkflowListApiResponse>(`/workflow/?${query}`)
}

/**
 * 获取单个工作流
 */
export async function getWorkflow(id: string): Promise<Workflow> {
  return request<Workflow>(`/workflow/${id}`)
}

/**
 * 创建工作流
 */
export async function createWorkflow(
  data: CreateWorkflowRequest
): Promise<Workflow> {
  return request<Workflow>('/workflow/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 更新工作流
 */
export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowRequest
): Promise<Workflow> {
  return request<Workflow>(`/workflow/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(id: string): Promise<void> {
  await request<void>(`/workflow/${id}`, {
    method: 'DELETE',
  })
}

/**
 * 运行工作流
 */
export async function runWorkflow(id: string): Promise<RunWorkflowResponse> {
  return request<RunWorkflowResponse>(`/workflow/${id}/run`, {
    method: 'POST',
  })
}

/**
 * 停止工作流
 */
export async function stopWorkflow(id: string): Promise<StopWorkflowResponse> {
  return request<StopWorkflowResponse>(`/workflow/${id}/stop`, {
    method: 'POST',
  })
}

/**
 * 获取 OKX 可用币种列表
 */
export interface CurrencyInfo {
  inst_id: string
  base_currency: string
  quote_currency: string
}

export interface GetCurrenciesResponse {
  success: boolean
  currencies: CurrencyInfo[]
  count: number
  error?: string
}

export async function getCurrencies(): Promise<GetCurrenciesResponse> {
  return request<GetCurrenciesResponse>('/workflow/currencies')
}
