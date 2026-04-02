"""
开始节点执行器
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
    """执行开始节点"""
    timestamp = time.time()
    trigger_type = config.get("trigger_type", "manual")

    logger.debug(f"[Start] 触发类型: {trigger_type}")

    output = {
        "triggered": True,
        "trigger_type": trigger_type,
        "execution_id": context.execution_id,
        "timestamp": context.execution_id.split("_")[1] if "_" in context.execution_id else None,
    }

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="start",
        data=output,
        timestamp=timestamp
    )
