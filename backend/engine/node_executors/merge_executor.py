"""
合并节点执行器 - 多输入聚合成 {"inputs": {node_id: NodeOutput, ...}}
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """
    执行合并节点 - 多输入聚合成 {"inputs": {node_id: NodeOutput, ...}}

    Args:
        node_id: 节点ID
        node_type: 节点类型
        inputs: Dict[str, NodeOutput] - key = 节点ID, value = NodeOutput
        config: 节点配置
        context: 执行上下文

    Returns:
        NodeOutput: 包含聚合后数据的输出
    """
    timestamp = time.time()

    logger.debug(f"[Merge] 节点 {node_id} 聚合 {len(inputs)} 个输入")

    # 将所有NodeOutput聚合成 {node_id: NodeOutput} 的字典
    merged_inputs: Dict[str, NodeOutput] = {}
    for input_node_id, node_output in inputs.items():
        merged_inputs[input_node_id] = node_output

    output = {
        "inputs": merged_inputs,
        "count": len(inputs),
    }

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="merge",
        data=output,
        timestamp=timestamp
    )
