"""
币种节点执行器
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


async def execute(node: Dict, context) -> Any:
    """执行币种节点"""
    config = node.get("config", {})
    currencies = config.get("currencies", [])

    logger.debug(f"执行币种节点: {currencies}")

    # 返回币种列表
    return {"currencies": currencies, "count": len(currencies)}
