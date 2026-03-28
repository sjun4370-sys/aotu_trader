from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from api.schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowListResponse,
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
        nodes=workflow.nodes,
        edges=workflow.edges,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
    )


@router.get("/", response_model=WorkflowListResponse)
async def list_workflows(db: Session = Depends(get_db)):
    service = WorkflowService(db)
    workflows = service.list_workflows()
    return WorkflowListResponse(
        workflows=[
            WorkflowResponse(
                id=w.id,
                name=w.name,
                description=w.description,
                nodes=w.nodes,
                edges=w.edges,
                created_at=w.created_at,
                updated_at=w.updated_at,
            )
            for w in workflows
        ]
    )


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    service = WorkflowService(db)
    success = service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted"}
