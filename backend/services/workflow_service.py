"""
工作流服务 - 封装工作流业务逻辑
"""

from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy.orm import Session
from database.workflow import Workflow
from engine.workflow_engine import workflow_engine
from engine.context import ExecutionContext
from engine.task_scheduler import task_scheduler
from config.system_config import system_config

if TYPE_CHECKING:
    from api.schemas.workflow import WorkflowCreateRequest, WorkflowUpdateRequest


class WorkflowService:
    def __init__(self, session: Session):
        self.session = session

    def create_workflow(self, request: WorkflowCreateRequest) -> Workflow:
        try:
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
        except Exception:
            self.session.rollback()
            raise

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        return self.session.query(Workflow).filter(Workflow.id == workflow_id).first()

    def list_workflows(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[Workflow], int]:
        """
        获取工作流列表（支持分页和筛选）

        Returns:
            (工作流列表, 总数)
        """
        query = self.session.query(Workflow)

        # 状态筛选
        if status:
            query = query.filter(Workflow.status == status)

        # 名称搜索
        if search:
            query = query.filter(Workflow.name.ilike(f"%{search}%"))

        # 获取总数
        total = query.count()

        # 分页
        offset = (page - 1) * page_size
        workflows = query.offset(offset).limit(page_size).all()

        return workflows, total

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
        try:
            self.session.commit()
            self.session.refresh(workflow)
            return workflow
        except Exception:
            self.session.rollback()
            raise

    def delete_workflow(self, workflow_id: str) -> bool:
        workflow = (
            self.session.query(Workflow).filter(Workflow.id == workflow_id).first()
        )
        if not workflow:
            return False
        try:
            self.session.delete(workflow)
            self.session.commit()
            return True
        except Exception:
            self.session.rollback()
            raise

    async def run_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """
        运行工作流

        Args:
            workflow_id: 工作流ID

        Returns:
            更新后的工作流对象，如果不存在则返回None
        """
        workflow = (
            self.session.query(Workflow).filter(Workflow.id == workflow_id).first()
        )
        if not workflow:
            return None

        # 检查是否已经在运行
        if workflow.status == "running":
            return workflow

        # 初始化 API（如果需要）
        if system_config.is_configured():
            workflow_engine.initialize_apis(
                okx_config=system_config.to_okx_config(),
                llm_config={"api_key": system_config.anthropic_api_key} if system_config.has_llm_config() else None,
                proxy=system_config.https_proxy if system_config.https_proxy else None
            )

        # 更新状态为运行中
        workflow.status = "running"
        workflow.last_run_at = datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(workflow)

        # 创建执行上下文
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        context = ExecutionContext(workflow_id=workflow_id, execution_id=execution_id)

        # 定义执行协程
        async def execute_workflow_coro():
            try:
                # 执行工作流
                results = await workflow_engine.execute_workflow(
                    workflow_id=workflow_id,
                    nodes=workflow.nodes,
                    edges=workflow.edges,
                    context=context,
                )

                # 检查是否有失败的节点
                has_failure = any(result.status.value == "failed" for result in results)

                # 更新工作流状态
                workflow.status = "failed" if has_failure else "idle"
                workflow.updated_at = datetime.now(timezone.utc)
                self.session.commit()

                return results

            except Exception as e:
                # 执行异常，更新状态
                workflow.status = "failed"
                workflow.updated_at = datetime.now(timezone.utc)
                self.session.commit()
                raise

        # 定义完成回调
        async def on_complete(wf_id: str, status: str, error: Optional[str]):
            # 可以在完成时执行额外操作，如发送通知
            pass

        # 提交任务到调度器
        await task_scheduler.submit_task(
            workflow_id=workflow_id,
            coroutine=execute_workflow_coro(),
            on_complete=on_complete,
        )

        return workflow

    async def stop_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """
        停止工作流

        Args:
            workflow_id: 工作流ID

        Returns:
            更新后的工作流对象，如果不存在则返回None
        """
        workflow = (
            self.session.query(Workflow).filter(Workflow.id == workflow_id).first()
        )
        if not workflow:
            return None

        # 检查是否在运行
        if workflow.status != "running":
            return workflow

        # 取消所有相关任务
        await task_scheduler.cancel_workflow_tasks(workflow_id)

        # 更新状态
        workflow.status = "idle"
        workflow.updated_at = datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(workflow)

        return workflow
