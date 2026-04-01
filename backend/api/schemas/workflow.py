"""
工作流相关 Pydantic 模型
"""

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class WorkflowPortSchema(BaseModel):
    id: str
    label: str
    direction: str


class WorkflowNodeSizeSchema(BaseModel):
    width: float
    height: float


class WorkflowNodeSchema(BaseModel):
    id: str
    type: str
    customName: str
    category: str
    label: str
    position: dict
    size: WorkflowNodeSizeSchema
    inputs: List[WorkflowPortSchema]
    outputs: List[WorkflowPortSchema]
    config: dict
    status: str


class WorkflowEdgeSchema(BaseModel):
    id: str
    fromNodeId: str
    fromPortId: str
    toNodeId: str
    toPortId: str


class WorkflowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_mode: Optional[str] = None
    nodes: List[WorkflowNodeSchema]
    edges: List[WorkflowEdgeSchema]


class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_mode: Optional[str] = None
    nodes: Optional[List[WorkflowNodeSchema]] = None
    edges: Optional[List[WorkflowEdgeSchema]] = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str = "idle"
    last_run_at: Optional[datetime] = None
    trigger_mode: Optional[str] = None
    nodes: List[dict]
    edges: List[dict]
    created_at: datetime
    updated_at: datetime


class WorkflowListItemResponse(BaseModel):
    """列表项响应（精简版）"""

    id: str
    name: str
    description: Optional[str]
    status: str
    last_run_at: Optional[datetime]
    trigger_mode: Optional[str]
    created_at: datetime
    updated_at: datetime


class WorkflowListResponse(BaseModel):
    workflows: List[WorkflowListItemResponse]
    total: int
    page: int
    page_size: int


class WorkflowRunResponse(BaseModel):
    """运行工作流响应"""

    success: bool
    message: str
    workflow_id: str
    status: str


class WorkflowStopResponse(BaseModel):
    """停止工作流响应"""

    success: bool
    message: str
    workflow_id: str
    status: str
