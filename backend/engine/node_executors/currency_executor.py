"""
币种选择节点执行器 - 从 OKX API 获取真实币种列表
"""
import time
from typing import Dict, List

from engine.context import ExecutionContext
from engine.node_output import NodeOutput
from engine.node_executors.okx_data_nodes import okx_manager

import logging

logger = logging.getLogger(__name__)


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
) -> NodeOutput:
    timestamp = time.time()

    # 获取用户选择的币种
    selected_currencies: List[str] = config.get("currencies", [])
    category = config.get("category", "crypto")

    # 如果配置了从 API 获取币种列表
    fetch_from_api = config.get("fetch_from_api", False)

    all_currencies = []

    if fetch_from_api:
        try:
            # 调用 OKX API 获取所有可用币种
            result = okx_manager.market.get_instruments(inst_type="SPOT")
            success, data = okx_manager.market.parse_response(result)

            if success and data:
                # 解析币种信息，提取有实际交易的币种
                for item in data:
                    inst_id = item.get("instId", "")
                    # 过滤掉不是该 category 的币种（如 USDT-M 永续等）
                    if inst_id.endswith("-USDT") and item.get("state") == "live":
                        all_currencies.append({
                            "inst_id": inst_id,
                            "base_currency": item.get("baseCcy", ""),
                            "quote_currency": item.get("quoteCcy", ""),
                            "state": item.get("state", ""),
                            "min_size": item.get("minSz", ""),
                            "max_size": item.get("maxSz", ""),
                        })
                logger.info(f"[Currency] 从 OKX API 获取到 {len(all_currencies)} 个可用币种")
        except Exception as e:
            logger.error(f"[Currency] 获取币种列表失败: {e}")

    # 构建输出
    # 如果用户没有选择币种但 API 获取了，返回所有可用币种
    # 如果用户选择了币种，返回用户选择的币种详情
    if selected_currencies:
        # 用户选择了币种，返回选中币种的详细信息
        output_currencies = []
        for inst_id in selected_currencies:
            # 如果已经从 API 获取了完整列表，匹配详细信息
            if all_currencies:
                matched = next((c for c in all_currencies if c["inst_id"] == inst_id), None)
                if matched:
                    output_currencies.append(matched)
                else:
                    # API 没有但用户选了，创建基础结构
                    output_currencies.append({
                        "inst_id": inst_id,
                        "base_currency": inst_id.replace("-USDT", ""),
                        "quote_currency": "USDT",
                        "state": "selected",
                        "min_size": "",
                        "max_size": "",
                    })
            else:
                # 没有 API 数据，创建基础结构
                output_currencies.append({
                    "inst_id": inst_id,
                    "base_currency": inst_id.replace("-USDT", ""),
                    "quote_currency": "USDT",
                    "state": "selected",
                    "min_size": "",
                    "max_size": "",
                })
        final_currencies = output_currencies
    elif all_currencies:
        # 用户没选择但 API 获取了，返回所有可用币种
        final_currencies = all_currencies
    else:
        # 都没有，返回默认
        final_currencies = [{
            "inst_id": "BTC-USDT",
            "base_currency": "BTC",
            "quote_currency": "USDT",
            "state": "default",
            "min_size": "",
            "max_size": "",
        }]

    # 第一个币种作为默认 inst_id（兼容旧逻辑）
    primary_inst_id = final_currencies[0]["inst_id"] if final_currencies else "BTC-USDT"

    output = {
        "inst_id": primary_inst_id,  # 保留向后兼容
        "currencies": final_currencies,  # 完整币种数组，包含详细信息
        "count": len(final_currencies),
        "category": category,
    }

    # 保存到上下文
    context.variables["inst_id"] = primary_inst_id
    context.variables["currencies"] = [c["inst_id"] for c in final_currencies]
    context.variables["currency"] = output

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="currency",
        data=output,
        timestamp=timestamp,
    )
