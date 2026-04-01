"""
任务调度器 - 管理运行中的工作流任务
"""

import asyncio
import uuid
from typing import Dict, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class TaskInfo:
    """任务信息"""

    task_id: str
    workflow_id: str
    task: asyncio.Task
    status: str = "running"  # running, completed, failed, cancelled
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    error: Optional[str] = None


class TaskScheduler:
    """任务调度器"""

    def __init__(self):
        self._tasks: Dict[str, TaskInfo] = {}
        self._lock = asyncio.Lock()

    async def submit_task(
        self,
        workflow_id: str,
        coroutine: Callable,
        on_complete: Optional[Callable] = None,
    ) -> str:
        """提交任务"""
        task_id = f"task_{uuid.uuid4().hex[:12]}"

        async def wrapped_coro():
            try:
                result = await coroutine
                async with self._lock:
                    if task_id in self._tasks:
                        self._tasks[task_id].status = "completed"
                        self._tasks[task_id].end_time = datetime.utcnow()

                if on_complete:
                    await on_complete(workflow_id, "completed", None)

                return result
            except asyncio.CancelledError:
                async with self._lock:
                    if task_id in self._tasks:
                        self._tasks[task_id].status = "cancelled"
                        self._tasks[task_id].end_time = datetime.utcnow()

                if on_complete:
                    await on_complete(workflow_id, "cancelled", None)

                raise
            except Exception as e:
                logger.exception(f"任务 {task_id} 执行异常")
                async with self._lock:
                    if task_id in self._tasks:
                        self._tasks[task_id].status = "failed"
                        self._tasks[task_id].end_time = datetime.utcnow()
                        self._tasks[task_id].error = str(e)

                if on_complete:
                    await on_complete(workflow_id, "failed", str(e))

                raise

        # 创建任务
        task = asyncio.create_task(wrapped_coro())

        task_info = TaskInfo(task_id=task_id, workflow_id=workflow_id, task=task)

        async with self._lock:
            self._tasks[task_id] = task_info

        logger.info(f"任务 {task_id} 已提交 (工作流: {workflow_id})")
        return task_id

    async def get_task_status(self, task_id: str) -> Optional[Dict]:
        """获取任务状态"""
        async with self._lock:
            task_info = self._tasks.get(task_id)
            if not task_info:
                return None

            return {
                "task_id": task_info.task_id,
                "workflow_id": task_info.workflow_id,
                "status": task_info.status,
                "start_time": task_info.start_time.isoformat()
                if task_info.start_time
                else None,
                "end_time": task_info.end_time.isoformat()
                if task_info.end_time
                else None,
                "error": task_info.error,
            }

    async def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        async with self._lock:
            task_info = self._tasks.get(task_id)
            if not task_info:
                return False

            if task_info.status != "running":
                return False

            # 取消 asyncio 任务
            task_info.task.cancel()
            task_info.status = "cancelled"
            task_info.end_time = datetime.utcnow()

        logger.info(f"任务 {task_id} 已取消")
        return True

    async def cancel_workflow_tasks(self, workflow_id: str) -> int:
        """取消工作流的所有任务"""
        cancelled_count = 0

        async with self._lock:
            for task_info in self._tasks.values():
                if (
                    task_info.workflow_id == workflow_id
                    and task_info.status == "running"
                ):
                    task_info.task.cancel()
                    task_info.status = "cancelled"
                    task_info.end_time = datetime.utcnow()
                    cancelled_count += 1

        if cancelled_count > 0:
            logger.info(f"已取消工作流 {workflow_id} 的 {cancelled_count} 个任务")

        return cancelled_count

    async def list_running_tasks(self) -> list:
        """列出运行中的任务"""
        async with self._lock:
            return [
                {
                    "task_id": t.task_id,
                    "workflow_id": t.workflow_id,
                    "status": t.status,
                    "start_time": t.start_time.isoformat() if t.start_time else None,
                }
                for t in self._tasks.values()
                if t.status == "running"
            ]

    async def cleanup_completed_tasks(self, max_age_seconds: int = 3600):
        """清理已完成的任务"""
        now = datetime.utcnow()
        to_remove = []

        async with self._lock:
            for task_id, task_info in self._tasks.items():
                if task_info.status in ("completed", "failed", "cancelled"):
                    if task_info.end_time:
                        age = (now - task_info.end_time).total_seconds()
                        if age > max_age_seconds:
                            to_remove.append(task_id)

            for task_id in to_remove:
                del self._tasks[task_id]

        if to_remove:
            logger.info(f"已清理 {len(to_remove)} 个完成的任务")


# 全局调度器实例
task_scheduler = TaskScheduler()
