"""
交易执行节点 - 真实下单到OKX
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, Dict, Optional
from decimal import Decimal

from engine.context import ExecutionContext
from engine.node_output import NodeOutput
from okx_api.trade import TradeAPI
from okx_api.account import AccountAPI
from okx_api.config import OKXConfig
from database.session import SessionLocal
from database.order import Order

logger = logging.getLogger(__name__)

# 交易API实例
trade_api: Optional[TradeAPI] = None
account_api: Optional[AccountAPI] = None


def init_trade_api(config: OKXConfig):
    """初始化交易API"""
    global trade_api, account_api
    trade_api = TradeAPI(config=config)
    account_api = AccountAPI(config=config)
    logger.info("交易API已初始化")


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """交易节点执行器入口"""
    timestamp = time.time()

    if node_type == "create_order":
        return await _execute_create_order(node_id, config, inputs, context, timestamp)
    elif node_type == "monitor_order":
        return await _execute_monitor_order(node_id, config, inputs, context, timestamp)
    elif node_type == "cancel_order":
        return await _execute_cancel_order(node_id, config, inputs, context, timestamp)
    elif node_type == "query_position":
        return await _execute_query_position(node_id, config, inputs, context, timestamp)
    else:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type=node_type,
            data={},
            timestamp=timestamp,
            error=f"Unknown node type: {node_type}"
        )


async def _execute_create_order(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    创建订单节点 - 根据信号实际下单
    """
    # 从inputs迭代收集上游节点数据
    signal_generator = {}
    ticker = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "signal_generator":
            signal_generator = data
        elif node_type == "okx_ticker":
            ticker = data

    # 兼容context.variables旧写法
    if not signal_generator:
        signal_generator = context.variables.get("trading_signal", {})
    if not ticker:
        ticker = context.variables.get("ticker", {})

    if not trade_api:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="create_order",
            data={},
            timestamp=timestamp,
            error="交易API未初始化"
        )

    # 获取订单参数
    inst_id = config.get("inst_id", "BTC-USDT")

    # 优先从信号获取买卖方向
    signal = signal_generator.get("signal", "") if signal_generator else ""
    if signal == "BUY":
        side = "buy"
    elif signal == "SELL":
        side = "sell"
    else:
        # HOLD 或无信号，不下单
        logger.info(f"[Trade] 信号为 {signal}，跳过下单")
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="create_order",
            data={"action": "skip", "signal": signal, "reason": "信号为HOLD，跳过下单"},
            timestamp=timestamp
        )

    ord_type = config.get("ord_type", "market")  # market / limit
    sz = config.get("sz", "0")  # 数量
    px = config.get("px")  # 价格（限价单）

    # 自动检测现货或合约
    td_mode = _detect_trade_mode(inst_id)
    pos_side = _detect_position_side(inst_id, side)

    # 生成客户端订单ID（使用uuid保证唯一性）
    cl_ord_id = f"wf_{int(time.time() * 1000)}_{context.execution_id[:8]}_{uuid.uuid4().hex[:6]}"

    logger.info(f"[Trade] 信号:{signal} -> 创建订单: {inst_id} {side} {ord_type} {sz}")

    # 自动检测现货或合约
    td_mode = _detect_trade_mode(inst_id)
    pos_side = _detect_position_side(inst_id, side)

    # 生成客户端订单ID（使用uuid保证唯一性）
    cl_ord_id = f"wf_{int(time.time() * 1000)}_{context.execution_id[:8]}_{uuid.uuid4().hex[:6]}"

    logger.info(f"[Trade] 创建订单: {inst_id} {side} {ord_type} {sz}")

    try:
        # 调用OKX API下单
        if ord_type == "market":
            result = trade_api.place_market_order(
                instId=inst_id, tdMode=td_mode, side=side, sz=str(sz), posSide=pos_side
            )
        else:  # limit
            if not px:
                raise ValueError("限价单必须指定价格")
            result = trade_api.place_limit_order(
                instId=inst_id,
                tdMode=td_mode,
                side=side,
                px=str(px),
                sz=str(sz),
                posSide=pos_side,
            )

        # 解析响应
        success, data = trade_api.parse_response(result)

        if success and data:
            order_info = data[0]
            output = {
                "success": True,
                "action": "order_placed",
                "signal": signal,
                "order_id": order_info.get("ordId"),
                "client_order_id": cl_ord_id,
                "inst_id": inst_id,
                "side": side,
                "ord_type": ord_type,
                "sz": sz,
                "px": px,
                "state": order_info.get("state"),  # live / partially_filled / filled
                "msg": "订单创建成功",
            }

            # 保存到上下文
            context.variables["last_order"] = output
            context.variables[f"order_{inst_id}"] = output

            # 落库到orders表
            try:
                db = SessionLocal()
                db.add(Order(
                    execution_id=getattr(context, "execution_id", "unknown"),
                    workflow_id=getattr(context, "workflow_id", "unknown"),
                    node_id=node_id,
                    order_id=order_info.get("ordId"),
                    client_order_id=cl_ord_id,
                    inst_id=inst_id,
                    side=side,
                    ord_type=ord_type,
                    sz=str(sz),
                    px=str(px) if px else None,
                    state=order_info.get("state", "live"),
                    raw_response=str(result),
                ))
                db.commit()
                db.close()
                logger.info(f"[Trade] 订单落库成功: {order_info.get('ordId')}")
            except Exception as db_err:
                logger.error(f"[Trade] 订单落库失败: {db_err}")
                # 落库失败不影响真实下单结果

            logger.info(f"[Trade] 订单创建成功: {output['order_id']}")
            return NodeOutput(
                success=True,
                node_id=node_id,
                node_type="create_order",
                data=output,
                timestamp=timestamp
            )
        else:
            error_msg = f"下单失败: {data}"
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="create_order",
                data={},
                timestamp=timestamp,
                error=error_msg
            )

    except Exception as e:
        logger.error(f"[Trade] 下单失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="create_order",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


def _detect_trade_mode(inst_id: str) -> str:
    """检测交易模式"""
    if "-SWAP" in inst_id or "-USD" in inst_id:
        return "cross"  # 合约使用全仓模式
    return "cash"  # 现货


def _detect_position_side(inst_id: str, side: str) -> Optional[str]:
    """检测持仓方向（合约需要）"""
    if "-SWAP" in inst_id:
        return "long" if side == "buy" else "short"
    return None  # 现货不需要


async def _execute_monitor_order(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    监控订单节点 - 轮询订单状态直到成交或超时
    """
    if not trade_api:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="monitor_order",
            data={},
            timestamp=timestamp,
            error="交易API未初始化"
        )

    # 获取订单信息 - 优先从inputs获取，其次从context.variables
    order = {}
    for src_id, src_output in inputs.items():
        if src_output and src_output.data:
            order = src_output.data
            break
    if not order:
        order = context.variables.get("last_order", {})
    inst_id = config.get("inst_id") or order.get("inst_id")
    order_id = config.get("order_id") or order.get("order_id")

    if not order_id:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="monitor_order",
            data={},
            timestamp=timestamp,
            error="未找到订单ID"
        )

    timeout = config.get("timeout", 60)  # 默认60秒超时
    poll_interval = config.get("poll_interval", 2)  # 轮询间隔2秒

    logger.info(f"[Trade] 监控订单: {order_id} (超时: {timeout}s)")

    start_time = time.time()
    filled_qty = Decimal("0")
    fill_price = None
    state = None

    try:
        while time.time() - start_time < timeout:
            # 查询订单状态
            result = trade_api.get_order(inst_id, order_id)
            success, data = trade_api.parse_response(result)

            if not success or not data:
                logger.warning(f"查询订单失败: {data}")
                await asyncio.sleep(poll_interval)
                continue

            order_info = data[0]
            state = order_info.get("state")
            filled_sz = Decimal(order_info.get("accFillSz", "0"))
            avg_px = order_info.get("avgPx")

            logger.debug(f"[Trade] 订单状态: {state}, 已成交: {filled_sz}")

            # 检查状态
            if state == "filled":
                fill_price = Decimal(avg_px) if avg_px else None
                filled_qty = filled_sz
                logger.info(f"[Trade] 订单完全成交: {order_id}, 均价: {fill_price}")
                break
            elif state == "partially_filled":
                filled_qty = filled_sz
                fill_price = Decimal(avg_px) if avg_px else None
                # 部分成交，继续等待
            elif state in ["canceled", "failed"]:
                logger.warning(f"[Trade] 订单被取消或失败: {state}")
                output = {
                    "success": False,
                    "order_id": order_id,
                    "state": state,
                    "filled_qty": str(filled_qty),
                    "reason": f"订单{state}",
                }
                return NodeOutput(
                    success=True,
                    node_id=node_id,
                    node_type="monitor_order",
                    data=output,
                    timestamp=timestamp
                )

            await asyncio.sleep(poll_interval)

        # 超时处理
        if filled_qty > 0:
            output = {
                "success": True,
                "order_id": order_id,
                "state": "partially_filled" if state != "filled" else "filled",
                "filled_qty": str(filled_qty),
                "fill_price": str(fill_price) if fill_price else None,
                "note": "订单部分成交或超时" if state != "filled" else "订单完全成交",
            }
        else:
            # 未成交，尝试取消
            try:
                trade_api.cancel_order(inst_id, order_id)
            except:
                pass

            output = {
                "success": False,
                "order_id": order_id,
                "state": "timeout",
                "filled_qty": "0",
                "reason": "超时未成交，已取消",
            }

        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="monitor_order",
            data=output,
            timestamp=timestamp
        )

    except Exception as e:
        logger.error(f"[Trade] 监控订单失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="monitor_order",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


async def _execute_cancel_order(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    取消订单节点
    """
    if not trade_api:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="cancel_order",
            data={},
            timestamp=timestamp,
            error="交易API未初始化"
        )

    # 获取订单信息 - 优先从inputs获取，其次从context.variables
    order = {}
    for src_id, src_output in inputs.items():
        if src_output and src_output.data:
            order = src_output.data
            break
    if not order:
        order = context.variables.get("last_order", {})
    inst_id = config.get("inst_id") or order.get("inst_id")
    order_id = config.get("order_id") or order.get("order_id")

    if not order_id:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="cancel_order",
            data={},
            timestamp=timestamp,
            error="未找到订单ID"
        )

    try:
        result = trade_api.cancel_order(inst_id, order_id)
        success, data = trade_api.parse_response(result)

        if success:
            logger.info(f"[Trade] 订单取消成功: {order_id}")
            output = {"success": True, "order_id": order_id, "msg": "订单已取消"}
        else:
            output = {"success": False, "order_id": order_id, "error": str(data)}

        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="cancel_order",
            data=output,
            timestamp=timestamp
        )

    except Exception as e:
        logger.error(f"[Trade] 取消订单失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="cancel_order",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


async def _execute_query_position(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    查询持仓节点
    """
    if not account_api:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="query_position",
            data={},
            timestamp=timestamp,
            error="账户API未初始化"
        )

    # 获取inst_id - 优先从inputs获取，其次从config
    inst_id = config.get("inst_id")
    if not inst_id:
        for src_id, src_output in inputs.items():
            if src_output and src_output.data and src_output.data.get("inst_id"):
                inst_id = src_output.data.get("inst_id")
                break

    logger.info(f"[Trade] 查询持仓" + (f" ({inst_id})" if inst_id else ""))

    try:
        result = account_api.get_positions(instId=inst_id)
        success, data = account_api.parse_response(result)

        if success:
            positions = []
            total_pnl = Decimal("0")

            for pos in data:
                position = {
                    "inst_id": pos.get("instId"),
                    "pos_side": pos.get("posSide"),
                    "pos": pos.get("pos"),
                    "avg_px": pos.get("avgPx"),
                    "mark_px": pos.get("markPx"),
                    "upl": pos.get("upl"),
                    "upl_ratio": pos.get("uplRatio"),
                    "margin": pos.get("margin"),
                    "lever": pos.get("lever"),
                }
                positions.append(position)
                if pos.get("upl"):
                    total_pnl += Decimal(pos["upl"])

            output = {
                "success": True,
                "positions": positions,
                "count": len(positions),
                "total_upl": str(total_pnl),
            }

            context.variables["positions"] = output
            logger.info(
                f"[Trade] 持仓查询完成: {len(positions)}个持仓, 总盈亏: {total_pnl}"
            )
            return NodeOutput(
                success=True,
                node_id=node_id,
                node_type="query_position",
                data=output,
                timestamp=timestamp
            )
        else:
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="query_position",
                data={},
                timestamp=timestamp,
                error=str(data)
            )

    except Exception as e:
        logger.error(f"[Trade] 查询持仓失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="query_position",
            data={},
            timestamp=timestamp,
            error=str(e)
        )
