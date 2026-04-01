"""
工作流执行引擎 - 解析和执行工作流
"""

import asyncio
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass
class ExecutionContext:
    """执行上下文，传递节点间数据"""

    workflow_id: str
    execution_id: str
    variables: Dict[str, Any] = field(default_factory=dict)
    node_outputs: Dict[str, Any] = field(default_factory=dict)
    stop_requested: bool = False

    def request_stop(self):
        self.stop_requested = True

    def is_stopped(self) -> bool:
        return self.stop_requested


@dataclass
class NodeExecutionResult:
    """节点执行结果"""

    node_id: str
    status: ExecutionStatus
    output: Any = None
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class WorkflowEngine:
    """工作流执行引擎"""

    def __init__(self):
        self._executors: Dict[str, Callable] = {}
        self._register_default_executors()

    def _register_default_executors(self):
        """注册默认的节点执行器"""
        from engine.node_executors import (
            currency_executor,
            market_executor,
            indicator_executor,
            strategy_executor,
            trade_executor,
            condition_executor,
            loop_executor,
        )

        self._executors = {
            "currency": currency_executor.execute,
            "market": market_executor.execute,
            "indicator": indicator_executor.execute,
            "strategy": strategy_executor.execute,
            "trade": trade_executor.execute,
            "condition": condition_executor.execute,
            "loop": loop_executor.execute,
        }

    def _build_dependency_graph(
        self, nodes: List[Dict], edges: List[Dict]
    ) -> Dict[str, List[str]]:
        """构建节点依赖图"""
        # 初始化图
        graph = {node["id"]: [] for node in nodes}

        # 添加边关系
        for edge in edges:
            from_node = edge.get("fromNodeId")
            to_node = edge.get("toNodeId")
            if from_node and to_node and to_node in graph:
                graph[to_node].append(from_node)

        return graph

    def _topological_sort(self, nodes: List[Dict], edges: List[Dict]) -> List[str]:
        """拓扑排序确定执行顺序"""
        graph = self._build_dependency_graph(nodes, edges)
        node_map = {node["id"]: node for node in nodes}

        # 计算入度
        in_degree = {node_id: 0 for node_id in graph}
        for node_id, dependencies in graph.items():
            in_degree[node_id] = len(dependencies)

        # Kahn's algorithm
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            # 找到所有没有依赖的节点
            current = queue.pop(0)
            result.append(current)

            # 移除当前节点对其他节点的依赖
            for node_id, dependencies in graph.items():
                if current in dependencies:
                    in_degree[node_id] -= 1
                    if in_degree[node_id] == 0:
                        queue.append(node_id)

        if len(result) != len(nodes):
            raise ValueError("工作流存在循环依赖，无法执行")

        return result

    async def execute_workflow(
        self,
        workflow_id: str,
        nodes: List[Dict],
        edges: List[Dict],
        context: ExecutionContext,
    ) -> List[NodeExecutionResult]:
        """执行工作流"""
        logger.info(f"开始执行工作流: {workflow_id}")

        # 构建节点映射
        node_map = {node["id"]: node for node in nodes}

        # 拓扑排序获取执行顺序
        try:
            execution_order = self._topological_sort(nodes, edges)
        except ValueError as e:
            logger.error(f"工作流拓扑排序失败: {e}")
            return [
                NodeExecutionResult(
                    node_id="workflow", status=ExecutionStatus.FAILED, error=str(e)
                )
            ]

        results = []

        for node_id in execution_order:
            # 检查停止信号
            if context.is_stopped():
                logger.info(f"工作流 {workflow_id} 被停止")
                results.append(
                    NodeExecutionResult(node_id=node_id, status=ExecutionStatus.STOPPED)
                )
                break

            node = node_map.get(node_id)
            if not node:
                continue

            # 执行节点
            result = await self._execute_node(node, context)
            results.append(result)

            # 保存节点输出到上下文
            if result.status == ExecutionStatus.COMPLETED:
                context.node_outputs[node_id] = result.output
            elif result.status == ExecutionStatus.FAILED:
                logger.error(f"节点 {node_id} 执行失败: {result.error}")
                # 可选：失败时停止后续执行
                break

        logger.info(f"工作流 {workflow_id} 执行完成")
        return results

    async def _execute_node(
        self, node: Dict, context: ExecutionContext
    ) -> NodeExecutionResult:
        """执行单个节点"""
        node_id = node.get("id", "unknown")
        node_type = node.get("type", "unknown")
        start_time = datetime.now(timezone.utc)

        logger.debug(f"执行节点: {node_id} (类型: {node_type})")

        # 获取执行器
        executor = self._executors.get(node_type)
        if not executor:
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.FAILED,
                error=f"未知的节点类型: {node_type}",
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )

        try:
            # 执行节点
            output = await executor(node, context)

            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.COMPLETED,
                output=output,
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.exception(f"节点 {node_id} 执行异常")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.FAILED,
                error=str(e),
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )


# 全局引擎实例
workflow_engine = WorkflowEngine()
