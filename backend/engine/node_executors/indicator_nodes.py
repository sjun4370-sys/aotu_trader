"""
技术指标节点执行器 - 使用pandas/numpy计算，不依赖TA-Lib
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict
from decimal import Decimal
import numpy as np
import pandas as pd

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)


def to_numpy_array(data: list) -> np.ndarray:
    """将Decimal列表转换为numpy数组"""
    return np.array([float(x) for x in data], dtype=np.float64)


def to_pandas_series(data: list) -> pd.Series:
    """将Decimal列表转换为pandas Series"""
    return pd.Series([float(x) for x in data])


def _calc_rsi(closes: pd.Series, period: int) -> pd.Series:
    """计算RSI指标"""
    delta = closes.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _calc_ema(series: pd.Series, span: int) -> pd.Series:
    """计算EMA"""
    return series.ewm(span=span, adjust=False).mean()


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """技术指标节点执行器入口"""
    timestamp = time.time()

    if node_type == "rsi":
        return await _execute_rsi(node_id, inputs, config, context, timestamp)
    elif node_type == "macd":
        return await _execute_macd(node_id, inputs, config, context, timestamp)
    elif node_type == "bollinger":
        return await _execute_bollinger(node_id, inputs, config, context, timestamp)
    elif node_type == "ma":
        return await _execute_ma(node_id, inputs, config, context, timestamp)
    else:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type=node_type,
            data={},
            timestamp=timestamp,
            error=f"Unknown node type: {node_type}"
        )


async def _execute_rsi(
    node_id: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """RSI指标节点"""
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 14)

    if not inputs:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="rsi",
            data={},
            timestamp=timestamp,
            error="RSI节点需要输入K线数据"
        )

    candles_output = list(inputs.values())[0]
    candles = candles_output.data.get("candles", [])
    inst_id = candles_output.data.get("inst_id", inst_id)

    if not candles:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="rsi",
            data={},
            timestamp=timestamp,
            error=f"未找到 {inst_id} 的K线数据，请先添加OKX K线节点"
        )

    logger.info(f"[TA] 计算 {inst_id} RSI({period})")

    closes = to_pandas_series([c["close"] for c in candles])
    rsi_values = _calc_rsi(closes, period)
    current_rsi = rsi_values.iloc[-1]

    if np.isnan(current_rsi):
        signal = "insufficient_data"
    elif current_rsi > 70:
        signal = "overbought"
    elif current_rsi < 30:
        signal = "oversold"
    else:
        signal = "neutral"

    rsi_trend = "flat"
    if len(rsi_values) > 5:
        recent_rsi = rsi_values.iloc[-5:].values
        if recent_rsi[-1] > recent_rsi[0]:
            rsi_trend = "rising"
        elif recent_rsi[-1] < recent_rsi[0]:
            rsi_trend = "falling"

    output = {
        "inst_id": inst_id,
        "period": period,
        "rsi": round(float(current_rsi), 2) if not np.isnan(current_rsi) else None,
        "signal": signal,
        "trend": rsi_trend,
        "history": [
            round(float(x), 2) if not np.isnan(x) else None for x in rsi_values.iloc[-20:].values
        ],
        "interpretation": _interpret_rsi(current_rsi, signal),
    }

    context.variables[f"{inst_id}_rsi_{period}"] = current_rsi
    context.variables["rsi"] = current_rsi
    logger.info(f"[TA] RSI: {output['rsi']}, 信号: {signal}")

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="rsi",
        data=output,
        timestamp=timestamp
    )


def _interpret_rsi(rsi: float, signal: str) -> str:
    """解读RSI指标"""
    if np.isnan(rsi):
        return "数据不足，无法计算RSI"

    interpretations = {
        "overbought": f"RSI为{rsi:.1f}，处于超买区间(>70)，市场可能过热，考虑卖出",
        "oversold": f"RSI为{rsi:.1f}，处于超卖区间(<30)，市场可能被低估，考虑买入",
        "neutral": f"RSI为{rsi:.1f}，处于中性区间(30-70)，趋势不明确",
    }
    return interpretations.get(signal, "未知信号")


async def _execute_macd(
    node_id: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """MACD指标节点"""
    inst_id = config.get("inst_id", "BTC-USDT")
    fast = config.get("fast_period", 12)
    slow = config.get("slow_period", 26)
    signal_period = config.get("signal_period", 9)

    if not inputs:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="macd",
            data={},
            timestamp=timestamp,
            error="MACD节点需要输入K线数据"
        )

    candles_output = list(inputs.values())[0]
    candles = candles_output.data.get("candles", [])
    inst_id = candles_output.data.get("inst_id", inst_id)

    if not candles:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="macd",
            data={},
            timestamp=timestamp,
            error=f"未找到 {inst_id} 的K线数据"
        )

    logger.info(f"[TA] 计算 {inst_id} MACD({fast},{slow},{signal_period})")

    closes = to_pandas_series([c["close"] for c in candles])

    ema_fast = _calc_ema(closes, fast)
    ema_slow = _calc_ema(closes, slow)
    macd_line = ema_fast - ema_slow
    macd_signal_line = _calc_ema(macd_line, signal_period)
    macd_hist = macd_line - macd_signal_line

    current_macd = macd_line.iloc[-1]
    current_signal = macd_signal_line.iloc[-1]
    current_hist = macd_hist.iloc[-1]

    if np.isnan(current_macd) or np.isnan(current_signal):
        macd_signal_type = "insufficient_data"
        crossover = None
    else:
        prev_macd = macd_line.iloc[-2] if len(macd_line) > 1 else current_macd
        prev_signal = macd_signal_line.iloc[-2] if len(macd_signal_line) > 1 else current_signal

        if prev_macd < prev_signal and current_macd > current_signal:
            crossover = "golden"
            macd_signal_type = "bullish"
        elif prev_macd > prev_signal and current_macd < current_signal:
            crossover = "death"
            macd_signal_type = "bearish"
        elif current_macd > current_signal:
            macd_signal_type = "bullish_trend"
            crossover = None
        else:
            macd_signal_type = "bearish_trend"
            crossover = None

    output = {
        "inst_id": inst_id,
        "macd": round(float(current_macd), 4) if not np.isnan(current_macd) else None,
        "signal": round(float(current_signal), 4) if not np.isnan(current_signal) else None,
        "histogram": round(float(current_hist), 4) if not np.isnan(current_hist) else None,
        "crossover": crossover,
        "trend": macd_signal_type,
        "interpretation": _interpret_macd(current_macd, current_signal, current_hist, crossover),
    }

    context.variables[f"{inst_id}_macd"] = output
    context.variables["macd"] = output
    logger.info(f"[TA] MACD: {output['macd']}, Signal: {output['signal']}, 趋势: {macd_signal_type}")

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="macd",
        data=output,
        timestamp=timestamp
    )


def _interpret_macd(macd: float, signal: float, hist: float, crossover: str) -> str:
    """解读MACD指标"""
    if np.isnan(macd):
        return "数据不足"

    if crossover == "golden":
        return f"MACD({macd:.3f})上穿Signal({signal:.3f})，形成金叉，买入信号"
    elif crossover == "death":
        return f"MACD({macd:.3f})下穿Signal({signal:.3f})，形成死叉，卖出信号"
    elif macd > signal:
        return f"MACD({macd:.3f})在Signal({signal:.3f})上方，多头趋势"
    else:
        return f"MACD({macd:.3f})在Signal({signal:.3f})下方，空头趋势"


async def _execute_bollinger(
    node_id: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """布林带节点"""
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 20)
    std_dev = config.get("std_dev", 2)

    if not inputs:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="bollinger",
            data={},
            timestamp=timestamp,
            error="布林带节点需要输入K线数据"
        )

    candles_output = list(inputs.values())[0]
    candles = candles_output.data.get("candles", [])
    inst_id = candles_output.data.get("inst_id", inst_id)

    if not candles:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="bollinger",
            data={},
            timestamp=timestamp,
            error=f"未找到 {inst_id} 的K线数据"
        )

    logger.info(f"[TA] 计算 {inst_id} Bollinger Bands({period},{std_dev})")

    closes = to_pandas_series([c["close"] for c in candles])

    middle = closes.rolling(window=period, min_periods=period).mean()
    std = closes.rolling(window=period, min_periods=period).std()
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)

    current_price = closes.iloc[-1]
    current_upper = upper.iloc[-1]
    current_middle = middle.iloc[-1]
    current_lower = lower.iloc[-1]

    if not np.isnan(current_upper) and not np.isnan(current_lower):
        bandwidth = ((current_upper - current_lower) / current_middle) * 100
        pct_position = ((current_price - current_lower) / (current_upper - current_lower)) * 100
    else:
        bandwidth = None
        pct_position = None

    if np.isnan(current_upper):
        signal = "insufficient_data"
    elif current_price > current_upper:
        signal = "upper_breakout"
    elif current_price < current_lower:
        signal = "lower_breakout"
    else:
        signal = "within_band"

    output = {
        "inst_id": inst_id,
        "upper": round(float(current_upper), 2) if not np.isnan(current_upper) else None,
        "middle": round(float(current_middle), 2) if not np.isnan(current_middle) else None,
        "lower": round(float(current_lower), 2) if not np.isnan(current_lower) else None,
        "current_price": round(float(current_price), 2),
        "bandwidth_pct": round(float(bandwidth), 2) if bandwidth else None,
        "percent_position": round(float(pct_position), 2) if pct_position else None,
        "signal": signal,
        "interpretation": _interpret_bollinger(current_price, current_upper, current_lower, signal, bandwidth),
    }

    logger.info(f"[TA] Bollinger: Upper={output['upper']}, Lower={output['lower']}, Signal={signal}")

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="bollinger",
        data=output,
        timestamp=timestamp
    )


def _interpret_bollinger(price: float, upper: float, lower: float, signal: str, bandwidth: float) -> str:
    """解读布林带"""
    if np.isnan(upper):
        return "数据不足"

    interpretations = {
        "upper_breakout": f"价格({price:.2f})突破布林带上轨({upper:.2f})，超买信号",
        "lower_breakout": f"价格({price:.2f})突破布林带下轨({lower:.2f})，超卖信号",
        "within_band": f"价格({price:.2f})在布林带内，波动率: {bandwidth:.1f}%",
    }
    return interpretations.get(signal, "未知信号")


async def _execute_ma(
    node_id: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """移动平均线节点"""
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 20)
    ma_type = config.get("ma_type", "SMA")

    if not inputs:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="ma",
            data={},
            timestamp=timestamp,
            error="MA节点需要输入K线数据"
        )

    candles_output = list(inputs.values())[0]
    candles = candles_output.data.get("candles", [])
    inst_id = candles_output.data.get("inst_id", inst_id)

    if not candles:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="ma",
            data={},
            timestamp=timestamp,
            error=f"未找到 {inst_id} 的K线数据"
        )

    logger.info(f"[TA] 计算 {inst_id} {ma_type}({period})")

    closes = to_pandas_series([c["close"] for c in candles])

    if ma_type == "SMA":
        ma_values = closes.rolling(window=period, min_periods=period).mean()
    elif ma_type == "EMA":
        ma_values = _calc_ema(closes, period)
    elif ma_type == "WMA":
        weights = np.arange(1, period + 1)
        ma_values = closes.rolling(window=period, min_periods=period).apply(
            lambda x: np.dot(x, weights) / weights.sum(), raw=True
        )
    else:
        ma_values = closes.rolling(window=period, min_periods=period).mean()

    current_ma = ma_values.iloc[-1]
    current_price = closes.iloc[-1]

    if np.isnan(current_ma):
        trend = "insufficient_data"
    elif current_price > current_ma:
        trend = "above"
    else:
        trend = "below"

    output = {
        "inst_id": inst_id,
        "ma_type": ma_type,
        "period": period,
        "ma_value": round(float(current_ma), 2) if not np.isnan(current_ma) else None,
        "current_price": round(float(current_price), 2),
        "trend": trend,
        "diff_pct": round((current_price - current_ma) / current_ma * 100, 2)
        if not np.isnan(current_ma) else None,
    }

    logger.info(f"[TA] {ma_type}: {output['ma_value']}, Price: {output['current_price']}")

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="ma",
        data=output,
        timestamp=timestamp
    )
