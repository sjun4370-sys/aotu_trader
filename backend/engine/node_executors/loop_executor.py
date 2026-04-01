"""
循环节点执行器
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


async def execute(node: Dict, context) -> Any:
    """执行循环节点"""
    config = node.get("config", {})
    loop_type = config.get("loopType", "count")
    count = config.get("count", 1)

    logger.debug(f"执行循环节点: {loop_type}, 次数={count}")

    return {
        "loop_type": loop_type,
        "count": count,
        "iterations": [],  # 实际应记录每次迭代的结果
        "completed": True,
    }
