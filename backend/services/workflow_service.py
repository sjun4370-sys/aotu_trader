"""
工作流服务 - 封装工作流业务逻辑
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.database.workflow import Workflow
from backend.api.schemas.workflow import WorkflowCreateRequest, WorkflowUpdateRequest


class WorkflowService:
    def __init__(self, session: Session):
        self.session = session

    def create_workflow(self, request: WorkflowCreateRequest) -> Workflow:
        workflow = Workflow(
            id=f"wf_{uuid.uuid4().hex[:12]}",
            name=request.name,
            description=request.description,
            nodes=[n.model_dump() for n in request.nodes],
            edges=[e.model_dump() for e in request.edges],
        )
        self.session.add(workflow)
        self.session.commit()
        self.session.refresh(workflow)
        return workflow

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        return self.session.query(Workflow).filter(Workflow.id == workflow_id).first()

    def list_workflows(self) -> List[Workflow]:
        return self.session.query(Workflow).all()

    def update_workflow(
        self, workflow_id: str, request: WorkflowUpdateRequest
    ) -> Optional[Workflow]:
        workflow = (
            self.session.query(Workflow).filter(Workflow.id == workflow_id).first()
        )
        if not workflow:
            return None
        if request.name is not None:
            workflow.name = request.name
        if request.description is not None:
            workflow.description = request.description
        if request.nodes is not None:
            workflow.nodes = [n.model_dump() for n in request.nodes]
        if request.edges is not None:
            workflow.edges = [e.model_dump() for e in request.edges]
        workflow.updated_at = datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(workflow)
        return workflow

    def delete_workflow(self, workflow_id: str) -> bool:
        workflow = (
            self.session.query(Workflow).filter(Workflow.id == workflow_id).first()
        )
        if not workflow:
            return False
        self.session.delete(workflow)
        self.session.commit()
        return True
