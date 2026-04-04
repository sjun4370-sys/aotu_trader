from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import logging
from api.schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
    WorkflowResponse,
    WorkflowListResponse,
    WorkflowListItemResponse,
    WorkflowStopResponse,
)
from services.workflow_service import WorkflowService
from database.session import get_db
from database.execution_log import ExecutionLog
from engine.workflow_engine import workflow_engine
from engine.context import ExecutionContext
from config.system_config import system_config

logger = logging.getLogger(__name__)

router = APIRouter(tags=["workflow"])


@router.get("/currencies")
async def get_currencies():
    """获取 OKX 可用币种列表"""
    from engine.node_executors.okx_data_nodes import okx_manager
    from config.system_config import system_config

    # 确保 OKX API 已初始化
    if system_config.is_configured() and (not hasattr(okx_manager, '_market_api') or okx_manager._market_api is None):
        okx_manager.initialize(system_config.to_okx_config())

    try:
        result = okx_manager.market.get_instruments(inst_type="SPOT")
        success, data = okx_manager.market.parse_response(result)

        if success and data:
            currencies = []
            for item in data:
                inst_id = item.get("instId", "")
                # 只返回 USDT 交易对的现货币种
                if inst_id.endswith("-USDT") and item.get("state") == "live":
                    currencies.append({
                        "inst_id": inst_id,
                        "base_currency": item.get("baseCcy", ""),
                        "quote_currency": item.get("quoteCcy", ""),
                    })
            return {"success": True, "currencies": currencies, "count": len(currencies)}
        else:
            return {"success": False, "currencies": [], "count": 0, "error": str(data)}
    except Exception as e:
        logger.error(f"[Currency API] 获取币种列表失败: {e}")
        return {"success": False, "currencies": [], "count": 0, "error": str(e)}


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(request: WorkflowCreateRequest, db: Session = Depends(get_db)):
    """创建工作流"""
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


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    service = WorkflowService(db)
    success = service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted"}


@router.post("/{workflow_id}/run")
async def run_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """运行工作流（同步执行，返回结果）"""
    service = WorkflowService(db)
    workflow = service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # 设置代理（如果配置了）
    if system_config.https_proxy:
        import os
        os.environ["HTTPS_PROXY"] = system_config.https_proxy
        os.environ["https_proxy"] = system_config.https_proxy
        logger.info(f"[Workflow] 已设置 HTTPS 代理: {system_config.https_proxy}")
    if system_config.http_proxy:
        import os
        os.environ["HTTP_PROXY"] = system_config.http_proxy
        os.environ["http_proxy"] = system_config.http_proxy
        logger.info(f"[Workflow] 已设置 HTTP 代理: {system_config.http_proxy}")

    # 初始化 API
    if system_config.is_configured():
        workflow_engine.initialize_apis(
            okx_config=system_config.to_okx_config(),
            llm_config={"api_key": system_config.anthropic_api_key} if system_config.has_llm_config() else None,
            proxy=system_config.https_proxy if system_config.https_proxy else None
        )

    # 创建执行上下文
    execution_id = f"exec_{workflow_id}_{int(datetime.now(timezone.utc).timestamp())}"
    context = ExecutionContext(workflow_id=workflow_id, execution_id=execution_id)

    # 创建执行级别日志记录
    exec_log = ExecutionLog(
        id=execution_id,
        workflow_id=workflow_id,
        execution_id=execution_id,
        node_id=None,
        node_type=None,
        start_time=datetime.now(timezone.utc),
        status="running",
    )
    db.add(exec_log)
    db.commit()

    # 同步执行工作流
    results = await workflow_engine.execute_workflow(
        workflow_id=workflow_id,
        nodes=workflow.nodes,
        edges=workflow.edges,
        context=context,
        db=db,
    )

    # 转换结果
    results_data = []
    has_failed = False
    for r in results:
        results_data.append({
            "node_id": r.node_id,
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "output": r.output,
            "error": r.error,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
        })
        if hasattr(r, 'status') and r.status.value == "failed":
            has_failed = True

    # 更新执行级别日志状态
    exec_log.status = "failed" if has_failed else "completed"
    exec_log.end_time = datetime.now(timezone.utc)
    db.commit()

    return {
        "success": True,
        "message": "Workflow executed",
        "workflow_id": workflow_id,
        "status": "failed" if has_failed else "completed",
        "results": results_data,
    }


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
