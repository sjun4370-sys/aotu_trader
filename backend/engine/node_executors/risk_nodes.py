"""
风险控制节点 - 真实风控逻辑
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict
from decimal import Decimal

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)


def _safe_decimal(value, default="0"):
    """安全转换为 Decimal"""
    if value is None:
        return Decimal(default)
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)

# 风控配置
RISK_CONFIG = {
    "max_loss_pct": Decimal("0.05"),  # 最大亏损比例 5%
    "max_position_pct": Decimal("0.3"),  # 最大仓位比例 30%
    "max_daily_trades": 50,  # 每日最大交易次数
    "min_order_value": Decimal("10"),  # 最小订单价值（USDT）
}


def set_risk_config(max_loss_pct: float = 0.05, max_position_pct: float = 0.3):
    """设置风控参数"""
    global RISK_CONFIG
    RISK_CONFIG["max_loss_pct"] = Decimal(str(max_loss_pct))
    RISK_CONFIG["max_position_pct"] = Decimal(str(max_position_pct))
    logger.info(
        f"[Risk] 风控配置更新: 最大亏损={max_loss_pct}%, 最大仓位={max_position_pct}%"
    )


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """风险节点执行器入口"""
    timestamp = time.time()

    if node_type == "risk_check":
        return await _execute_risk_check(node_id, config, inputs, context, timestamp)
    elif node_type == "stop_loss":
        return await _execute_stop_loss(node_id, config, inputs, context, timestamp)
    elif node_type == "take_profit":
        return await _execute_take_profit(node_id, config, inputs, context, timestamp)
    elif node_type == "position_sizing":
        return await _execute_position_sizing(node_id, config, inputs, context, timestamp)
    else:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type=node_type,
            data={},
            timestamp=timestamp,
            error=f"Unknown node type: {node_type}"
        )


async def _execute_risk_check(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    风险控制检查节点 - 综合风控检查
    """
    # 从inputs迭代收集上游节点数据
    signal = {}
    account_balance = {}
    positions = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "signal_generator":
            signal = data
        elif node_type == "okx_account":
            account_balance = data
        elif node_type == "okx_positions":
            positions = data
        elif node_type == "okx_ticker":
            pass

    # 兼容context.variables旧写法
    if not signal:
        signal = context.variables.get("trading_signal", {})
    if not account_balance:
        account_balance = context.variables.get("account_balance", {})
    if not positions:
        positions = context.variables.get("positions", {})

    # 将inputs数据同步到context.variables，供内部check函数使用
    context.variables["account_balance"] = account_balance
    context.variables["positions"] = positions

    if not signal:
        output = {"approved": False, "reason": "未找到交易信号", "checks": []}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="risk_check",
            data=output,
            timestamp=timestamp
        )

    logger.info("[Risk] 开始风控检查")

    checks = []
    all_passed = True

    # 1. 检查最大亏损比例
    try:
        loss_check = await _check_max_loss(context)
        checks.append(loss_check)
        if not loss_check["passed"]:
            all_passed = False
    except Exception as e:
        checks.append({"passed": False, "check": "max_loss", "reason": f"检查异常: {e}"})

    # 2. 检查最大仓位
    try:
        position_check = await _check_max_position(context, signal)
        checks.append(position_check)
        if not position_check["passed"]:
            all_passed = False
    except Exception as e:
        checks.append({"passed": False, "check": "max_position", "reason": f"检查异常: {e}"})

    # 3. 检查每日交易次数
    try:
        trade_count_check = await _check_daily_trade_count(context)
        checks.append(trade_count_check)
        if not trade_count_check["passed"]:
            all_passed = False
    except Exception as e:
        checks.append({"passed": False, "check": "daily_trade_count", "reason": f"检查异常: {e}"})

    # 4. 检查订单价值
    try:
        value_check = await _check_min_order_value(signal)
        checks.append(value_check)
        if not value_check["passed"]:
            all_passed = False
    except Exception as e:
        checks.append({"passed": False, "check": "min_order_value", "reason": f"检查异常: {e}"})

    # 5. 检查持仓时间（避免过度交易）
    try:
        time_check = await _check_cooldown(context, signal)
        checks.append(time_check)
        if not time_check["passed"]:
            all_passed = False
    except Exception as e:
        checks.append({"passed": False, "check": "cooldown", "reason": f"检查异常: {e}"})

    output = {
        "approved": all_passed,
        "reason": "通过"
        if all_passed
        else "; ".join([c["reason"] for c in checks if not c["passed"]]),
        "checks": checks,
        "risk_level": _calculate_risk_level(checks),
    }

    context.variables["risk_check_result"] = output

    if all_passed:
        logger.info("[Risk] 风控检查通过")
    else:
        logger.warning(f"[Risk] 风控检查未通过: {output['reason']}")

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="risk_check",
        data=output,
        timestamp=timestamp
    )


async def _check_max_loss(context: ExecutionContext) -> Dict:
    """检查最大亏损比例"""
    # 获取今日已实现盈亏
    today_pnl = _safe_decimal(context.variables.get("today_pnl"))
    initial_balance = _safe_decimal(context.variables.get("initial_balance"), "10000")

    if initial_balance <= 0:
        return {"passed": True, "check": "max_loss", "reason": "N/A"}

    loss_pct = abs(today_pnl) / initial_balance if today_pnl < 0 else Decimal("0")
    max_loss = RISK_CONFIG["max_loss_pct"]

    passed = loss_pct < max_loss

    return {
        "passed": passed,
        "check": "max_loss",
        "current": f"{loss_pct * 100:.2f}%",
        "limit": f"{max_loss * 100:.2f}%",
        "reason": f"已达到最大亏损限制 ({max_loss * 100}%)" if not passed else "通过",
    }


async def _check_max_position(context: ExecutionContext, signal: Dict) -> Dict:
    """检查最大仓位"""
    account = context.variables.get("account_balance", {})
    positions = context.variables.get("positions", {})

    total_equity = _safe_decimal(account.get("total_equity"))
    current_positions_value = Decimal("0")

    # 计算当前持仓价值
    for pos in positions.get("positions", []):
        # 兼容不同来源的字段名：okx_data_nodes 用 pos_size，trade_nodes 用 pos
        pos_value = pos.get("pos_size") or pos.get("pos")
        mark_px = pos.get("mark_px")
        if pos_value and mark_px is not None:
            current_positions_value += abs(_safe_decimal(pos_value)) * _safe_decimal(mark_px)

    # 计算新订单价值
    qty_val = signal.get("qty")
    price_val = signal.get("price")
    if qty_val is not None and price_val is not None:
        new_order_value = _safe_decimal(qty_val) * _safe_decimal(price_val)
    else:
        new_order_value = Decimal("0")

    if total_equity <= 0:
        return {"passed": True, "check": "max_position", "reason": "N/A"}

    new_position_pct = (current_positions_value + new_order_value) / total_equity
    max_position = RISK_CONFIG["max_position_pct"]

    passed = new_position_pct <= max_position

    return {
        "passed": passed,
        "check": "max_position",
        "current": f"{new_position_pct * 100:.2f}%",
        "limit": f"{max_position * 100:.2f}%",
        "reason": f"超出最大仓位限制 ({max_position * 100}%)" if not passed else "通过",
    }


async def _check_daily_trade_count(context: ExecutionContext) -> Dict:
    """检查每日交易次数"""
    today_trade_count = context.variables.get("today_trade_count", 0)
    max_trades = RISK_CONFIG["max_daily_trades"]

    passed = today_trade_count < max_trades

    return {
        "passed": passed,
        "check": "daily_trade_count",
        "current": today_trade_count,
        "limit": max_trades,
        "reason": f"已达到每日最大交易次数 ({max_trades})" if not passed else "通过",
    }


async def _check_min_order_value(signal: Dict) -> Dict:
    """检查最小订单价值"""
    qty_val = signal.get("qty")
    price_val = signal.get("price")

    # 处理 None 或无效值
    if qty_val is None or price_val is None:
        return {
            "passed": False,
            "check": "min_order_value",
            "current": "N/A",
            "limit": f"{RISK_CONFIG['min_order_value']:.2f} USDT",
            "reason": "信号中缺少数量或价格信息",
        }

    try:
        qty = _safe_decimal(qty_val)
        price = _safe_decimal(price_val)
        order_value = qty * price
    except Exception:
        return {
            "passed": False,
            "check": "min_order_value",
            "current": "N/A",
            "limit": f"{RISK_CONFIG['min_order_value']:.2f} USDT",
            "reason": "数量或价格格式无效",
        }

    min_value = RISK_CONFIG["min_order_value"]

    passed = order_value >= min_value

    return {
        "passed": passed,
        "check": "min_order_value",
        "current": f"{order_value:.2f} USDT",
        "limit": f"{min_value:.2f} USDT",
        "reason": f"订单价值低于最小限制 ({min_value} USDT)" if not passed else "通过",
    }


async def _check_cooldown(context: ExecutionContext, signal: Dict) -> Dict:
    """检查交易冷却时间（避免过度交易）"""
    last_trade_time = context.variables.get("last_trade_time", 0)
    current_time = int(time.time())

    # 默认30秒冷却时间
    cooldown_seconds = 30

    passed = (current_time - last_trade_time) >= cooldown_seconds

    return {
        "passed": passed,
        "check": "cooldown",
        "current": f"{current_time - last_trade_time}s",
        "limit": f"{cooldown_seconds}s",
        "reason": f"交易过于频繁，请等待{cooldown_seconds}秒" if not passed else "通过",
    }


def _calculate_risk_level(checks: list) -> str:
    """计算整体风险等级"""
    failed_count = sum(1 for c in checks if not c["passed"])

    if failed_count >= 2:
        return "high"
    elif failed_count == 1:
        return "medium"
    else:
        return "low"


async def _execute_stop_loss(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    止损检查节点
    """
    inst_id = config.get("inst_id")
    stop_loss_pct = Decimal(str(config.get("stop_loss_pct", 0.02)))  # 默认2%

    # 从inputs迭代收集上游节点数据
    positions = {}
    ticker = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "okx_positions":
            positions = data
        elif node_type == "okx_ticker":
            ticker = data

    # 兼容context.variables旧写法
    if not positions:
        positions = context.variables.get("positions", {})
    if not ticker:
        ticker = context.variables.get("ticker", {})

    current_price = ticker.get("last", context.variables.get(f"{inst_id}_price", 0))

    if not current_price or not positions:
        output = {"triggered": False, "reason": "无持仓或无价格数据"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="stop_loss",
            data=output,
            timestamp=timestamp
        )

    # 查找对应持仓
    target_position = None
    for pos in positions.get("positions", []):
        if pos.get("inst_id") == inst_id:
            target_position = pos
            break

    if not target_position:
        output = {"triggered": False, "reason": "未找到持仓"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="stop_loss",
            data=output,
            timestamp=timestamp
        )

    entry_price = Decimal(str(target_position.get("avg_px", 0)))
    pos_side = target_position.get("pos_side")

    if not entry_price or not pos_side:
        output = {"triggered": False, "reason": "持仓数据不完整"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="stop_loss",
            data=output,
            timestamp=timestamp
        )

    current_price = Decimal(str(current_price))

    # 计算亏损比例
    if pos_side == "long":
        loss_pct = (entry_price - current_price) / entry_price
        triggered = loss_pct >= stop_loss_pct
    else:  # short
        loss_pct = (current_price - entry_price) / entry_price
        triggered = loss_pct >= stop_loss_pct

    output = {
        "triggered": triggered,
        "inst_id": inst_id,
        "entry_price": str(entry_price),
        "current_price": str(current_price),
        "loss_pct": f"{loss_pct * 100:.2f}%",
        "stop_loss_pct": f"{stop_loss_pct * 100:.2f}%",
        "action": "CLOSE_POSITION" if triggered else "HOLD",
        "reason": f"触发止损，亏损达到{loss_pct * 100:.2f}%"
        if triggered
        else "未触发止损",
    }

    logger.info(f"[Risk] 止损检查: {inst_id} - {output['reason']}")
    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="stop_loss",
        data=output,
        timestamp=timestamp
    )


async def _execute_take_profit(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    止盈检查节点
    """
    inst_id = config.get("inst_id")
    take_profit_pct = Decimal(str(config.get("take_profit_pct", 0.05)))  # 默认5%

    # 从inputs迭代收集上游节点数据
    positions = {}
    ticker = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "okx_positions":
            positions = data
        elif node_type == "okx_ticker":
            ticker = data

    # 兼容context.variables旧写法
    if not positions:
        positions = context.variables.get("positions", {})
    if not ticker:
        ticker = context.variables.get("ticker", {})

    current_price = ticker.get("last", context.variables.get(f"{inst_id}_price", 0))

    if not current_price or not positions:
        output = {"triggered": False, "reason": "无持仓或无价格数据"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="take_profit",
            data=output,
            timestamp=timestamp
        )

    target_position = None
    for pos in positions.get("positions", []):
        if pos.get("inst_id") == inst_id:
            target_position = pos
            break

    if not target_position:
        output = {"triggered": False, "reason": "未找到持仓"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="take_profit",
            data=output,
            timestamp=timestamp
        )

    entry_price = Decimal(str(target_position.get("avg_px", 0)))
    pos_side = target_position.get("pos_side")

    if not entry_price or not pos_side:
        output = {"triggered": False, "reason": "持仓数据不完整"}
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="take_profit",
            data=output,
            timestamp=timestamp
        )

    current_price = Decimal(str(current_price))

    # 计算盈利比例
    if pos_side == "long":
        profit_pct = (current_price - entry_price) / entry_price
        triggered = profit_pct >= take_profit_pct
    else:  # short
        profit_pct = (entry_price - current_price) / entry_price
        triggered = profit_pct >= take_profit_pct

    output = {
        "triggered": triggered,
        "inst_id": inst_id,
        "entry_price": str(entry_price),
        "current_price": str(current_price),
        "profit_pct": f"{profit_pct * 100:.2f}%",
        "take_profit_pct": f"{take_profit_pct * 100:.2f}%",
        "action": "CLOSE_POSITION" if triggered else "HOLD",
        "reason": f"触发止盈，盈利达到{profit_pct * 100:.2f}%"
        if triggered
        else "未触发止盈",
    }

    logger.info(f"[Risk] 止盈检查: {inst_id} - {output['reason']}")
    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="take_profit",
        data=output,
        timestamp=timestamp
    )


async def _execute_position_sizing(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    仓位计算节点
    """
    # 从inputs迭代收集上游节点数据
    account = {}
    signal = {}
    ticker = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "okx_account":
            account = data
        elif node_type == "signal_generator":
            signal = data
        elif node_type == "okx_ticker":
            ticker = data

    # 兼容context.variables旧写法
    if not account:
        account = context.variables.get("account_balance", {})
    if not signal:
        signal = context.variables.get("trading_signal", {})
    if not ticker:
        ticker = context.variables.get("ticker", {})

    risk_level = signal.get("risk_level", "medium")
    total_equity = _safe_decimal(account.get("total_equity"))
    current_price = _safe_decimal(ticker.get("last", context.variables.get("price", 0)))

    if total_equity <= 0 or current_price <= 0:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="position_sizing",
            data={},
            timestamp=timestamp,
            error="账户余额或价格数据无效"
        )

    # 根据风险等级调整仓位
    risk_multipliers = {
        "low": Decimal("0.1"),
        "medium": Decimal("0.2"),
        "high": Decimal("0.05"),  # 高风险反而降低仓位
    }

    multiplier = risk_multipliers.get(risk_level, Decimal("0.1"))
    position_value = total_equity * multiplier
    qty = position_value / current_price

    # 应用最大仓位限制
    max_position_value = total_equity * RISK_CONFIG["max_position_pct"]
    if position_value > max_position_value:
        position_value = max_position_value
        qty = position_value / current_price

    output = {
        "success": True,
        "total_equity": str(total_equity),
        "position_value": str(position_value),
        "qty": str(qty.quantize(Decimal("0.00001"))),  # 精度控制
        "risk_level": risk_level,
        "multiplier": str(multiplier),
        "percentage": f"{multiplier * 100}%",
    }

    logger.info(f"[Risk] 仓位计算: {output['qty']} (风险等级: {risk_level})")
    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="position_sizing",
        data=output,
        timestamp=timestamp
    )
