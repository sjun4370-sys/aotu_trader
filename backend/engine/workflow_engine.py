"""
工作流执行引擎 - 解析和执行工作流
注册所有真实节点执行器（OKX数据/AI分析/交易执行/风控）
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable, Set
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

from engine.node_executors.okx_data_nodes import (
    okx_manager,
    execute_node as execute_okx_data,
)
from engine.node_executors.indicator_nodes import (
    execute_node as execute_indicator,
)
from engine.node_executors.ai_nodes import (
    execute_node as execute_ai,
    init_llm_clients,
)
from engine.node_executors.trade_nodes import (
    execute_node as execute_trade,
    init_trade_api,
)
from engine.node_executors.risk_nodes import (
    execute_node as execute_risk,
)
from engine.node_executors.condition_executor import execute_node as execute_condition
from engine.node_executors.loop_executor import execute_node as execute_loop
from engine.node_executors.start_executor import execute_node as execute_start
from engine.node_executors.currency_executor import execute_node as execute_currency
from engine.node_executors.merge_executor import execute_node as execute_merge

logger = logging.getLogger(__name__)


class ExecutionStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


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
        # 触发器节点
        self._executors["start"] = execute_start

        # 币种选择节点
        self._executors["currency"] = execute_currency

        # OKX数据节点
        self._executors["okx_ticker"] = execute_okx_data
        self._executors["okx_candles"] = execute_okx_data
        self._executors["okx_orderbook"] = execute_okx_data
        self._executors["okx_account"] = execute_okx_data
        self._executors["okx_positions"] = execute_okx_data

        # 指标节点
        self._executors["rsi"] = execute_indicator
        self._executors["macd"] = execute_indicator
        self._executors["bollinger"] = execute_indicator
        self._executors["ma"] = execute_indicator

        # AI节点
        self._executors["llm_analysis"] = execute_ai
        self._executors["signal_generator"] = execute_ai

        # 交易节点
        self._executors["create_order"] = execute_trade
        self._executors["monitor_order"] = execute_trade
        self._executors["cancel_order"] = execute_trade
        self._executors["query_position"] = execute_trade

        # 风控节点
        self._executors["risk_check"] = execute_risk
        self._executors["stop_loss"] = execute_risk
        self._executors["take_profit"] = execute_risk
        self._executors["position_sizing"] = execute_risk

        # 逻辑控制节点
        self._executors["condition"] = execute_condition
        self._executors["loop"] = execute_loop

        # 合并节点
        self._executors["merge"] = execute_merge

        logger.info(f"[Engine] 注册了 {len(self._executors)} 个节点执行器")

    def initialize_apis(self, okx_config=None, llm_config=None, proxy=None):
        """初始化所有API连接"""
        if okx_config:
            okx_manager.initialize(okx_config, proxy)
            init_trade_api(okx_config)
            logger.info("[Engine] OKX API已初始化")

        if llm_config:
            init_llm_clients()
            logger.info("[Engine] LLM客户端已初始化")

    async def execute_workflow(
        self,
        workflow_id: str,
        nodes: List[Dict],
        edges: List[Dict],
        context: ExecutionContext,
        db=None,  # NEW
    ) -> List[NodeExecutionResult]:
        """执行工作流"""
        logger.info(f"[Engine] 开始执行工作流: {workflow_id}")

        node_map = {node["id"]: node for node in nodes}
        active_nodes = {node["id"] for node in nodes}

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
            # Skip check: node not in active branch
            if node_id not in active_nodes:
                results.append(
                    NodeExecutionResult(
                        node_id=node_id,
                        status=ExecutionStatus.SKIPPED,
                        start_time=datetime.now(timezone.utc),
                        end_time=datetime.now(timezone.utc),
                    )
                )
                context.node_outputs[node_id] = NodeOutput(
                    success=True,
                    node_id=node_id,
                    node_type=node_map.get(node_id, {}).get("type", "unknown"),
                    data={"skipped": True},
                    timestamp=datetime.now(timezone.utc).timestamp(),
                )
                continue

            if context.is_stopped():
                logger.info(f"[Engine] 工作流 {workflow_id} 被停止")
                results.append(
                    NodeExecutionResult(node_id=node_id, status=ExecutionStatus.STOPPED)
                )
                break

            node = node_map.get(node_id)
            if not node:
                continue

            # 构建当前节点的 inputs: Dict[str, NodeOutput]
            inputs: Dict[str, NodeOutput] = {}
            for edge in edges:
                if edge.get("toNodeId") == node_id:
                    from_id = edge.get("fromNodeId")
                    if from_id in context.node_outputs:
                        inputs[from_id] = context.node_outputs[from_id]

            start_time = datetime.now(timezone.utc)
            result = await self._execute_node(node, node_id, inputs, context)
            end_time = datetime.now(timezone.utc)
            results.append(result)

            if result.status == ExecutionStatus.COMPLETED:
                node_type = node.get("type", "unknown")
                context.node_outputs[node_id] = NodeOutput(
                    success=True,
                    node_id=node_id,
                    node_type=node_type,
                    data=result.output if result.output is not None else {},
                    timestamp=result.end_time.timestamp() if result.end_time else 0,
                )

                # Condition branch skipping
                if node.get("type") == "condition":
                    condition_result = False
                    if isinstance(result.output, dict):
                        condition_result = result.output.get("result", False)
                    disable_port = "false" if condition_result else "true"
                    nodes_to_disable = self._collect_downstream_nodes(node_id, disable_port, edges)
                    for nid in nodes_to_disable:
                        active_nodes.discard(nid)

                # Persist execution log
                if db:
                    from database.execution_log import ExecutionLog
                    log_record = ExecutionLog(
                        id=f"{context.execution_id}_{node_id}",
                        workflow_id=workflow_id,
                        execution_id=context.execution_id,
                        node_id=node_id,
                        node_type=node_type,
                        start_time=start_time,
                        end_time=end_time,
                        duration_ms=(end_time - start_time).total_seconds() * 1000,
                        status="completed",
                        output_data=result.output if isinstance(result.output, dict) else {"output": str(result.output)},
                    )
                    db.commit()

            elif result.status == ExecutionStatus.SKIPPED:
                if db:
                    from database.execution_log import ExecutionLog
                    log_record = ExecutionLog(
                        id=f"{context.execution_id}_{node_id}",
                        workflow_id=workflow_id,
                        execution_id=context.execution_id,
                        node_id=node_id,
                        node_type=node_map.get(node_id, {}).get("type", "unknown"),
                        start_time=start_time,
                        end_time=end_time,
                        duration_ms=(end_time - start_time).total_seconds() * 1000,
                        status="skipped",
                        output_data={"skipped": True},
                    )
                    db.commit()

            elif result.status == ExecutionStatus.FAILED:
                node_type = node.get("type", "unknown")
                context.node_outputs[node_id] = NodeOutput(
                    success=False,
                    node_id=node_id,
                    node_type=node_type,
                    data={},
                    timestamp=datetime.now(timezone.utc).timestamp(),
                    error=result.error,
                )
                logger.error(f"[Engine] 节点 {node_id} 执行失败: {result.error}")
                if db:
                    from database.execution_log import ExecutionLog
                    log_record = ExecutionLog(
                        id=f"{context.execution_id}_{node_id}",
                        workflow_id=workflow_id,
                        execution_id=context.execution_id,
                        node_id=node_id,
                        node_type=node_type,
                        start_time=start_time,
                        end_time=end_time,
                        duration_ms=(end_time - start_time).total_seconds() * 1000,
                        status="failed",
                        error_message=result.error or "Unknown error",
                    )
                    db.commit()
                break

        logger.info(f"[Engine] 工作流 {workflow_id} 执行完成")
        return results

    async def _execute_node(
        self, node: Dict, node_id: str, inputs: Dict[str, NodeOutput], context: ExecutionContext
    ) -> NodeExecutionResult:
        """执行单个节点"""
        node_type = node.get("type", "unknown")
        config = node.get("config", {})
        start_time = datetime.now(timezone.utc)

        logger.info(f"[Engine] === 执行节点: {node_id} (类型: {node_type}) ===")
        logger.info(f"[Engine] 配置: {config}")

        # 打印输入数据
        input_keys = list(inputs.keys())
        logger.info(f"[Engine] 输入来源: {input_keys}")
        for src_id, src_output in inputs.items():
            logger.info(f"[Engine]   ├─ 来源节点: {src_id}")
            if hasattr(src_output, 'data') and src_output.data:
                logger.info(f"[Engine]   │  └─ data: {src_output.data}")
            elif hasattr(src_output, 'error') and src_output.error:
                logger.error(f"[Engine]   │  └─ error: {src_output.error}")

        executor = self._executors.get(node_type)
        if not executor:
            logger.error(f"[Engine] ✗ 未知节点类型: {node_type}")
            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.FAILED,
                error=f"未知的节点类型: {node_type}",
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )

        try:
            output = await executor(node_id, node_type, inputs, config, context)

            # 打印执行结果
            if hasattr(output, 'success') and output.success:
                logger.info(f"[Engine] ✓ 节点 {node_id} 执行成功")
                logger.info(f"[Engine]   └─ 输出数据: {output.data}")
            else:
                logger.error(f"[Engine] ✗ 节点 {node_id} 执行失败: {output.error if hasattr(output, 'error') else 'unknown error'}")
                logger.error(f"[Engine]   └─ 输出数据: {output.data if hasattr(output, 'data') else output}")

            return NodeExecutionResult(
                node_id=node_id,
                status=ExecutionStatus.COMPLETED,
                output=output.data if hasattr(output, 'data') else output,
                start_time=start_time,
                end_time=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.exception(f"[Engine] ✗ 节点 {node_id} 执行异常: {e}")
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

    def _collect_downstream_nodes(
        self, from_node_id: str, from_port_id: str, edges: List[Dict]
    ) -> Set[str]:
        """收集从某节点某端口出发的所有下游节点（递归）"""
        result = set()
        queue = [from_node_id]
        visited = {from_node_id}

        while queue:
            current = queue.pop(0)
            for edge in edges:
                edge_from = edge.get("fromNodeId")
                edge_port = edge.get("fromPortId")
                edge_to = edge.get("toNodeId")

                if edge_from == current and edge_to and edge_to not in visited:
                    should_follow = False
                    if current == from_node_id:
                        if edge_port == from_port_id:
                            should_follow = True
                    else:
                        should_follow = True

                    if should_follow:
                        result.add(edge_to)
                        visited.add(edge_to)
                        queue.append(edge_to)

        return result


# 全局引擎实例
workflow_engine = WorkflowEngine()
