from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from api.schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowListItemResponse,
    WorkflowRunResponse,
    WorkflowStopResponse,
)
from services.workflow_service import WorkflowService
from database.session import get_db

router = APIRouter(tags=["workflow"])


@router.post("/save", response_model=WorkflowResponse)
async def save_workflow(request: WorkflowCreateRequest, db: Session = Depends(get_db)):
    service = WorkflowService(db)
    workflow = service.create_workflow(request)
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        status=workflow.status,
        last_run_at=workflow.last_run_at,
        trigger_mode=workflow.trigger_mode,
        nodes=workflow.nodes,
        edges=workflow.edges,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    service = WorkflowService(db)
    workflow = service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        status=workflow.status,
        last_run_at=workflow.last_run_at,
        trigger_mode=workflow.trigger_mode,
        nodes=workflow.nodes,
        edges=workflow.edges,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str, request: WorkflowUpdateRequest, db: Session = Depends(get_db)
):
    service = WorkflowService(db)
    workflow = service.update_workflow(workflow_id, request)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse(
        id=workflow.id,
        name=workflow.name,
        description=workflow.description,
        status=workflow.status,
        last_run_at=workflow.last_run_at,
        trigger_mode=workflow.trigger_mode,
        nodes=workflow.nodes,
        edges=workflow.edges,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选"),
    search: Optional[str] = Query(None, description="名称搜索"),
    db: Session = Depends(get_db),
):
    """获取工作流列表（支持分页和筛选）"""
    service = WorkflowService(db)
    workflows, total = service.list_workflows(
        page=page, page_size=page_size, status=status, search=search
    )
    return WorkflowListResponse(
        workflows=[
            WorkflowListItemResponse(
                id=w.id,
                name=w.name,
                description=w.description,
                status=w.status,
                last_run_at=w.last_run_at,
                trigger_mode=w.trigger_mode,
                created_at=w.created_at,
                updated_at=w.updated_at,
            )
            for w in workflows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    service = WorkflowService(db)
    success = service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted"}


@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse)
async def run_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """运行工作流"""
    service = WorkflowService(db)
    workflow = await service.run_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowRunResponse(
        success=True,
        message="Workflow started",
        workflow_id=workflow.id,
        status=workflow.status,
    )


@router.post("/{workflow_id}/stop", response_model=WorkflowStopResponse)
async def stop_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """停止工作流"""
    service = WorkflowService(db)
    workflow = await service.stop_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowStopResponse(
        success=True,
        message="Workflow stopped",
        workflow_id=workflow.id,
        status=workflow.status,
    )
