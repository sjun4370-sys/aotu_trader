"""
工作流执行引擎 - 解析和执行工作流
更新：注册所有真实节点执行器
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum

from engine.node_executors.okx_data_nodes import (
    okx_manager,
    execute_okx_ticker,
    execute_okx_candles,
    execute_okx_orderbook,
    execute_okx_account,
    execute_okx_positions,
)
from engine.node_executors.indicator_nodes import (
    execute_rsi,
    execute_macd,
    execute_bollinger,
    execute_ma,
)
from engine.node_executors.ai_nodes import (
    execute_llm_analysis,
    execute_signal_generator,
    init_llm_clients,
)
from engine.node_executors.trade_nodes import (
    trade_api,
    account_api,
    execute_create_order,
    execute_monitor_order,
    execute_cancel_order,
    execute_query_position,
    init_trade_api,
)
from engine.node_executors.risk_nodes import (
    execute_risk_check,
    execute_stop_loss,
    execute_take_profit,
    execute_position_sizing,
)

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

    def set_input(self, key: str, value: Any):
        """设置输入变量"""
        self.variables[key] = value

    def get_input(self, key: str) -> Any:
        """获取输入变量"""
        return self.variables.get(key)


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
    """工作流执行引擎 - 生产级"""

    def __init__(self):
        self._executors: Dict[str, Callable] = {}
        self._register_all_executors()

    def _register_all_executors(self):
        """注册所有节点执行器"""
        # OKX数据节点
        self._executors["okx_ticker"] = execute_okx_ticker
        self._executors["okx_candles"] = execute_okx_candles
        self._executors["okx_orderbook"] = execute_okx_orderbook
        self._executors["okx_account"] = execute_okx_account
        self._executors["okx_positions"] = execute_okx_positions

        # 指标节点
        self._executors["rsi"] = execute_rsi
        self._executors["macd"] = execute_macd
        self._executors["bollinger"] = execute_bollinger
        self._executors["ma"] = execute_ma

        # AI节点
        self._executors["llm_analysis"] = execute_llm_analysis
        self._executors["signal_generator"] = execute_signal_generator

        # 交易节点
        self._executors["create_order"] = execute_create_order
        self._executors["monitor_order"] = execute_monitor_order
        self._executors["cancel_order"] = execute_cancel_order
        self._executors["query_position"] = execute_query_position

        # 风控节点
        self._executors["risk_check"] = execute_risk_check
        self._executors["stop_loss"] = execute_stop_loss
        self._executors["take_profit"] = execute_take_profit
        self._executors["position_sizing"] = execute_position_sizing

        # 兼容旧节点类型
        self._executors["market"] = execute_okx_ticker
        self._executors["account"] = execute_okx_account
        self._executors["indicator"] = execute_rsi
        self._executors["analysis"] = execute_llm_analysis
        self._executors["trade"] = execute_create_order

        logger.info(f"[Engine] 注册了 {len(self._executors)} 个节点执行器")

    def initialize_apis(self, okx_config=None, llm_config=None):
        """初始化所有API连接"""
        # 初始化OKX
        if okx_config:
            okx_manager.initialize(okx_config)
            init_trade_api(okx_config)
            logger.info("[Engine] OKX API已初始化")

        # 初始化LLM
        if llm_config:
            init_llm_clients()
            logger.info("[Engine] LLM客户端已初始化")

    async def execute_workflow(
        self,
        workflow_id: str,
        nodes: List[Dict],
        edges: List[Dict],
        context: ExecutionContext,
    ) -> List[NodeExecutionResult]:
        """执行工作流"""
        logger.info(f"[Engine] 开始执行工作流: {workflow_id}")

        # 构建节点映射
        node_map = {node["id"]: node for node in nodes}

        # 拓扑排序
        try:
            execution_order = self._topological_sort(nodes, edges)
        except ValueError as e:
            logger.error(f"[Engine] 拓扑排序失败: {e}")
            return [
                NodeExecutionResult(
                    node_id="workflow", status=ExecutionStatus.FAILED, error=str(e)
                )
            ]

        results = []

        for node_id in execution_order:
            # 检查停止信号
            if context.is_stopped():
                logger.info(f"[Engine] 工作流 {workflow_id} 被停止")
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

            # 保存输出
            if result.status == ExecutionStatus.COMPLETED:
                context.node_outputs[node_id] = result.output
            elif result.status == ExecutionStatus.FAILED:
                logger.error(f"[Engine] 节点 {node_id} 执行失败: {result.error}")
                # 继续执行还是停止？根据配置决定
                break

        logger.info(f"[Engine] 工作流 {workflow_id} 执行完成")
        return results

    async def _execute_node(
        self, node: Dict, context: ExecutionContext
    ) -> NodeExecutionResult:
        """执行单个节点"""
        node_id = node.get("id", "unknown")
        node_type = node.get("type", "unknown")
        start_time = datetime.now(timezone.utc)

        logger.debug(f"[Engine] 执行节点: {node_id} (类型: {node_type})")

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
            logger.exception(f"[Engine] 节点 {node_id} 执行异常")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.FAILED,
                error=str(e),
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )

    def _build_dependency_graph(
        self, nodes: List[Dict], edges: List[Dict]
    ) -> Dict[str, List[str]]:
        """构建节点依赖图"""
        graph = {node["id"]: [] for node in nodes}

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

        in_degree = {node_id: 0 for node_id in graph}
        for node_id, dependencies in graph.items():
            in_degree[node_id] = len(dependencies)

        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            current = queue.pop(0)
            result.append(current)

            for node_id, dependencies in graph.items():
                if current in dependencies:
                    in_degree[node_id] -= 1
                    if in_degree[node_id] == 0:
                        queue.append(node_id)

        if len(result) != len(nodes):
            raise ValueError("工作流存在循环依赖，无法执行")

        return result


# 全局引擎实例
workflow_engine = WorkflowEngine()
