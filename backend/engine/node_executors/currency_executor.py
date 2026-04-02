"""
币种选择节点执行器
"""
import time
from typing import Dict

from engine.context import ExecutionContext
from engine.node_output import NodeOutput


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
) -> NodeOutput:
    timestamp = time.time()

    inst_id = config.get("inst_id", "BTC-USDT")
    name = config.get("name", inst_id)
    category = config.get("category", "crypto")

    output = {
        "inst_id": inst_id,
        "name": name,
        "category": category,
    }

    context.variables["inst_id"] = inst_id
    context.variables["currency"] = output

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="currency",
        data=output,
        timestamp=timestamp,
    )