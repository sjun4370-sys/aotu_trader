"""
OKX API 节点执行器 - 真实调用OKX API
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, Optional
from decimal import Decimal
from datetime import datetime

from okx_api.market import MarketAPI
from okx_api.trade import TradeAPI
from okx_api.account import AccountAPI
from okx_api.config import OKXConfig

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)


class OKXConnectorManager:
    """OKX连接器管理器 - 线程安全单例模式"""

    _instance: Optional["OKXConnectorManager"] = None
    _lock: threading.Lock = threading.Lock()
    _market_api: Optional[MarketAPI] = None
    _trade_api: Optional[TradeAPI] = None
    _account_api: Optional[AccountAPI] = None

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self, config: OKXConfig, proxy: str = None):
        """初始化连接器"""
        self._market_api = MarketAPI(flag=config.flag, proxy=proxy)
        self._trade_api = TradeAPI(config=config)
        self._account_api = AccountAPI(config=config)
        logger.info(f"OKX连接器已初始化 (模拟盘: {config.is_demo}, 代理: {proxy})")

    @property
    def market(self) -> MarketAPI:
        if not self._market_api:
            raise RuntimeError("OKX未初始化，请先调用initialize()")
        return self._market_api

    @property
    def trade(self) -> TradeAPI:
        if not self._trade_api:
            raise RuntimeError("OKX未初始化，请先调用initialize()")
        return self._trade_api

    @property
    def account(self) -> AccountAPI:
        if not self._account_api:
            raise RuntimeError("OKX未初始化，请先调用initialize()")
        return self._account_api


# 全局连接器实例
okx_manager = OKXConnectorManager()


# ==================== 数据节点 ====================


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """OKX数据节点执行器入口"""
    timestamp = time.time()

    if node_type == "okx_ticker":
        return await _execute_okx_ticker(node_id, config, inputs, context, timestamp)
    elif node_type == "okx_candles":
        return await _execute_okx_candles(node_id, config, inputs, context, timestamp)
    elif node_type == "okx_orderbook":
        return await _execute_okx_orderbook(node_id, config, context, timestamp)
    elif node_type == "okx_account":
        return await _execute_okx_account(node_id, context, timestamp)
    elif node_type == "okx_positions":
        return await _execute_okx_positions(node_id, config, context, timestamp)
    else:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type=node_type,
            data={},
            timestamp=timestamp,
            error=f"Unknown node type: {node_type}"
        )


async def _execute_okx_ticker(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """OKX行情节点 - 真实API调用，支持多币种"""
    # 优先从配置获取币种列表
    inst_ids: List[str] = config.get("inst_ids", [])

    # 如果没有，从上游获取
    if not inst_ids:
        for input_node_id, input_output in inputs.items():
            if hasattr(input_output, 'data') and input_output.data:
                data = input_output.data
                if isinstance(data, dict):
                    if data.get("currencies"):
                        currencies_data = data.get("currencies", [])
                        if isinstance(currencies_data, list) and len(currencies_data) > 0:
                            if isinstance(currencies_data[0], str):
                                inst_ids = currencies_data
                            else:
                                inst_ids = [c.get("inst_id") or c.get("code") for c in currencies_data if c.get("inst_id") or c.get("code")]
                        elif data.get("inst_id"):
                            inst_ids = [data.get("inst_id")]
                    elif data.get("inst_ids"):
                        inst_ids = data.get("inst_ids", [])

    # 如果还是没有，使用默认或单个 inst_id
    if not inst_ids:
        inst_id = config.get("inst_id", "BTC-USDT")
        inst_ids = [inst_id]

    logger.info(f"[OKX API] 获取行情数据 (币种: {inst_ids})")

    all_tickers: Dict[str, Dict] = {}
    errors: Dict[str, str] = {}

    for inst_id in inst_ids:
        try:
            result = okx_manager.market.get_ticker(inst_id)
            success, data = okx_manager.market.parse_response(result)

            if success and data:
                ticker = data[0]
                output = {
                    "inst_id": ticker.get("instId"),
                    "last": Decimal(ticker.get("last", 0)),
                    "open_24h": Decimal(ticker.get("open24h", 0)),
                    "high_24h": Decimal(ticker.get("high24h", 0)),
                    "low_24h": Decimal(ticker.get("low24h", 0)),
                    "vol_24h": Decimal(ticker.get("vol24h", 0)),
                    "vol_ccy_24h": Decimal(ticker.get("volCcy24h", 0)),
                    "bid": Decimal(ticker.get("bidPx", 0)) if ticker.get("bidPx") else None,
                    "ask": Decimal(ticker.get("askPx", 0)) if ticker.get("askPx") else None,
                    "bid_sz": Decimal(ticker.get("bidSz", 0))
                    if ticker.get("bidSz")
                    else None,
                    "ask_sz": Decimal(ticker.get("askSz", 0))
                    if ticker.get("askSz")
                    else None,
                    "timestamp": int(ticker.get("ts", 0)),
                    "change_24h": (
                        (Decimal(ticker.get("last", 0)) - Decimal(ticker.get("open24h", 0)))
                        / Decimal(ticker.get("open24h", 1))
                        * 100
                    )
                    if ticker.get("open24h")
                    else Decimal("0"),
                }

                all_tickers[inst_id] = output

                # 保存到上下文变量
                context.variables[f"{inst_id}_price"] = output["last"]
                context.variables[f"{inst_id}_ticker"] = output

                logger.info(f"[OKX API] {inst_id} 当前价格: {output['last']}")
            else:
                errors[inst_id] = f"API返回错误: {data}"
                logger.warning(f"[OKX API] {inst_id} 获取失败: {data}")

        except Exception as e:
            errors[inst_id] = str(e)
            logger.error(f"[OKX API] {inst_id} 获取异常: {e}")

    # 汇总结果
    result_output = {
        "inst_ids": inst_ids,
        "tickers": all_tickers,
        "count": len(all_tickers),
        "errors": errors if errors else None,
    }

    # 保存默认币种数据到上下文
    if all_tickers:
        first_inst_id = list(all_tickers.keys())[0]
        context.variables["ticker"] = all_tickers[first_inst_id]
        context.variables["inst_id"] = first_inst_id

    if errors and not all_tickers:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="okx_ticker",
            data={},
            timestamp=timestamp,
            error=f"所有币种获取失败: {errors}"
        )

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="okx_ticker",
        data=result_output,
        timestamp=timestamp
    )


async def _execute_okx_candles(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """OKX K线节点 - 真实API调用，支持多币种"""
    bar = config.get(
        "bar", "1H"
    )  # OKX API 要求大写格式: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 8H, 12H, 1D, 1W, 1M
    # 转换小写为大字（前端传的是 "1h"，OKX 需要 "1H"）
    bar = bar.upper() if bar else "1H"
    limit = config.get("limit", 100)

    # 优先从配置获取币种，如果没有则从上游输入获取
    inst_ids: List[str] = config.get("inst_ids", [])

    if not inst_ids:
        # 从上游币种选择器获取币种列表
        for input_node_id, input_output in inputs.items():
            if hasattr(input_output, 'data') and input_output.data:
                data = input_output.data
                # 支持 currencies 数组格式
                if isinstance(data, dict):
                    if data.get("currencies"):
                        currencies_data = data.get("currencies", [])
                        if isinstance(currencies_data, list) and len(currencies_data) > 0:
                            # currencies 可能是字符串数组或对象数组
                            if isinstance(currencies_data[0], str):
                                inst_ids = currencies_data
                            else:
                                inst_ids = [c.get("inst_id") or c.get("code") for c in currencies_data if c.get("inst_id") or c.get("code")]
                        elif data.get("inst_id"):
                            inst_ids = [data.get("inst_id")]
                # 支持直接的 inst_ids 数组
                elif data.get("inst_ids"):
                    inst_ids = data.get("inst_ids", [])

    # 如果还是没有，使用默认 BTC
    if not inst_ids:
        inst_ids = ["BTC-USDT"]

    logger.info(f"[OKX API] 获取 K线数据 (币种: {inst_ids}, 周期: {bar}, 条数: {limit})")

    try:
        all_candles: Dict[str, List] = {}
        all_closes: Dict[str, List] = {}
        errors: Dict[str, str] = {}

        for inst_id in inst_ids:
            try:
                result = okx_manager.market.get_candles(inst_id, bar=bar, limit=limit)
                success, data = okx_manager.market.parse_response(result)

                if success and data:
                    candles = []
                    for item in data:
                        candle = {
                            "timestamp": int(item[0]),
                            "open": Decimal(item[1]),
                            "high": Decimal(item[2]),
                            "low": Decimal(item[3]),
                            "close": Decimal(item[4]),
                            "vol": Decimal(item[5]),
                            "vol_ccy": Decimal(item[6]) if len(item) > 6 else None,
                        }
                        candles.append(candle)

                    closes = [c["close"] for c in candles]
                    all_candles[inst_id] = candles
                    all_closes[inst_id] = closes

                    # 保存到上下文
                    context.variables[f"{inst_id}_candles_{bar}"] = candles
                    context.variables[f"{inst_id}_closes"] = closes

                    logger.info(f"[OKX API] {inst_id} 获取到 {len(candles)} 条K线数据")
                else:
                    errors[inst_id] = f"API返回错误: {data}"
                    logger.warning(f"[OKX API] {inst_id} 获取失败: {data}")

            except Exception as e:
                errors[inst_id] = str(e)
                logger.error(f"[OKX API] {inst_id} 获取异常: {e}")

        # 汇总结果
        output = {
            "inst_ids": inst_ids,
            "bar": bar,
            "candles": all_candles,
            "closes": all_closes,
            "count": sum(len(c) for c in all_candles.values()),
            "errors": errors if errors else None,
        }

        # 保存默认币种数据到上下文
        if all_candles:
            first_inst_id = list(all_candles.keys())[0]
            context.variables["candles"] = all_candles[first_inst_id]
            context.variables["closes"] = all_closes[first_inst_id]
            context.variables["inst_id"] = first_inst_id
            output["latest_close"] = all_candles[first_inst_id][0]["close"] if all_candles[first_inst_id] else None

        if errors and not all_candles:
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="okx_candles",
                data={},
                timestamp=timestamp,
                error=f"所有币种获取失败: {errors}"
            )

        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="okx_candles",
            data=output,
            timestamp=timestamp
        )

    except Exception as e:
        logger.error(f"[OKX API] 获取K线失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="okx_candles",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


async def _execute_okx_orderbook(
    node_id: str,
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """OKX订单簿节点 - 真实API调用"""
    inst_id = config.get("inst_id", "BTC-USDT")
    depth = config.get("depth", 20)

    logger.info(f"[OKX API] 获取 {inst_id} 订单簿 (深度: {depth})")

    try:
        result = okx_manager.market.get_orderbook(inst_id, sz=depth)
        success, data = okx_manager.market.parse_response(result)

        if success and data:
            book = data[0]
            output = {
                "inst_id": book.get("instId"),
                "timestamp": int(book.get("ts", 0)),
                "bids": [[Decimal(p), Decimal(s)] for p, s in book.get("bids", [])],
                "asks": [[Decimal(p), Decimal(s)] for p, s in book.get("asks", [])],
                "bid_depth": sum(Decimal(s) for _, s in book.get("bids", [])),
                "ask_depth": sum(Decimal(s) for _, s in book.get("asks", [])),
            }

            # 计算买卖压力
            if output["bids"] and output["asks"]:
                best_bid = output["bids"][0][0]
                best_ask = output["asks"][0][0]
                mid_price = (best_bid + best_ask) / 2
                spread = (best_ask - best_bid) / mid_price * 100

                output["best_bid"] = best_bid
                output["best_ask"] = best_ask
                output["mid_price"] = mid_price
                output["spread_pct"] = spread

            logger.info(f"[OKX API] 订单簿价差: {output.get('spread_pct', 'N/A')}%")
            return NodeOutput(
                success=True,
                node_id=node_id,
                node_type="okx_orderbook",
                data=output,
                timestamp=timestamp
            )
        else:
            error_msg = f"API返回错误: {data}"
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="okx_orderbook",
                data={},
                timestamp=timestamp,
                error=error_msg
            )

    except Exception as e:
        logger.error(f"[OKX API] 获取订单簿失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="okx_orderbook",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


async def _execute_okx_account(
    node_id: str,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """OKX账户信息节点 - 真实API调用"""
    logger.info("[OKX API] 获取账户信息")

    try:
        result = okx_manager.account.get_balance()
        success, data = okx_manager.account.parse_response(result)

        if success and data:
            balance_data = data[0] if isinstance(data, list) else data

            output = {
                "total_equity": Decimal(balance_data.get("totalEq", 0)),
                "isolated_equity": Decimal(balance_data.get("isoEq", 0)),
                "details": [],
            }

            # 解析各币种余额
            for detail in balance_data.get("details", []):
                output["details"].append(
                    {
                        "ccy": detail.get("ccy"),
                        "equity": Decimal(detail.get("eq", 0)),
                        "cash_balance": Decimal(detail.get("cashBal", 0)),
                        "available": Decimal(detail.get("availBal", 0)),
                        "frozen": Decimal(detail.get("frozenBal", 0)),
                        "upl": Decimal(detail.get("upl", 0))
                        if detail.get("upl")
                        else Decimal("0"),
                    }
                )

            context.variables["account_balance"] = output
            logger.info(f"[OKX API] 账户权益: {output['total_equity']} USDT")
            return NodeOutput(
                success=True,
                node_id=node_id,
                node_type="okx_account",
                data=output,
                timestamp=timestamp
            )
        else:
            error_msg = f"API返回错误: {data}"
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="okx_account",
                data={},
                timestamp=timestamp,
                error=error_msg
            )

    except Exception as e:
        logger.error(f"[OKX API] 获取账户信息失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="okx_account",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


async def _execute_okx_positions(
    node_id: str,
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """OKX持仓节点 - 真实API调用"""
    inst_id = config.get("inst_id")  # 如果指定则查询特定币种

    logger.info(f"[OKX API] 获取持仓信息" + (f" ({inst_id})" if inst_id else ""))

    try:
        result = okx_manager.account.get_positions(instId=inst_id)
        success, data = okx_manager.account.parse_response(result)

        if success:
            positions = []
            for pos in data:
                position = {
                    "inst_id": pos.get("instId"),
                    "pos_side": pos.get("posSide"),  # long, short, net
                    "pos_size": Decimal(pos.get("pos", 0)),
                    "avg_px": Decimal(pos.get("avgPx", 0))
                    if pos.get("avgPx")
                    else None,
                    "mark_px": Decimal(pos.get("markPx", 0))
                    if pos.get("markPx")
                    else None,
                    "upl": Decimal(pos.get("upl", 0)),  # 未实现盈亏
                    "upl_ratio": Decimal(pos.get("uplRatio", 0)) * 100
                    if pos.get("uplRatio")
                    else None,
                    "margin": Decimal(pos.get("margin", 0)),
                    "lever": int(pos.get("lever", 1)),
                    "liq_px": Decimal(pos.get("liqPx", 0))
                    if pos.get("liqPx")
                    else None,
                }
                positions.append(position)

            output = {
                "positions": positions,
                "count": len(positions),
                "total_upl": sum(p["upl"] for p in positions),
            }

            context.variables["positions"] = output
            logger.info(
                f"[OKX API] 持仓数量: {len(positions)}, 总盈亏: {output['total_upl']}"
            )
            return NodeOutput(
                success=True,
                node_id=node_id,
                node_type="okx_positions",
                data=output,
                timestamp=timestamp
            )
        else:
            error_msg = f"API返回错误: {data}"
            return NodeOutput(
                success=False,
                node_id=node_id,
                node_type="okx_positions",
                data={},
                timestamp=timestamp,
                error=error_msg
            )

    except Exception as e:
        logger.error(f"[OKX API] 获取持仓失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="okx_positions",
            data={},
            timestamp=timestamp,
            error=str(e)
        )
