"""
技术指标节点执行器 - 使用TA-Lib真实计算
"""

import logging
from typing import Any, Dict, List
from decimal import Decimal
import numpy as np
import talib

from engine.workflow_engine import ExecutionContext

logger = logging.getLogger(__name__)


def to_numpy_array(data: List[Decimal]) -> np.ndarray:
    """将Decimal列表转换为numpy数组"""
    return np.array([float(x) for x in data], dtype=np.float64)


async def execute_rsi(node: Dict, context: ExecutionContext) -> Any:
    """RSI指标节点 - 真实计算"""
    config = node.get("config", {})
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 14)
    bar = config.get("bar", "1H")

    # 从上下文获取K线数据
    candles_key = f"{inst_id}_candles_{bar}"
    candles = context.variables.get(candles_key)

    if not candles:
        raise Exception(f"未找到 {inst_id} 的K线数据，请先添加OKX K线节点")

    logger.info(f"[TA-Lib] 计算 {inst_id} RSI({period})")

    # 提取收盘价
    closes = to_numpy_array([c["close"] for c in candles])

    # 计算RSI
    rsi_values = talib.RSI(closes, timeperiod=period)
    current_rsi = rsi_values[-1]

    # 确定信号
    if np.isnan(current_rsi):
        signal = "insufficient_data"
    elif current_rsi > 70:
        signal = "overbought"
    elif current_rsi < 30:
        signal = "oversold"
    else:
        signal = "neutral"

    # 计算RSI趋势
    rsi_trend = "flat"
    if len(rsi_values) > 5:
        recent_rsi = rsi_values[-5:]
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
            round(float(x), 2) if not np.isnan(x) else None for x in rsi_values[-20:]
        ],
        "interpretation": _interpret_rsi(current_rsi, signal),
    }

    context.variables[f"{inst_id}_rsi_{period}"] = current_rsi
    logger.info(f"[TA-Lib] RSI: {output['rsi']}, 信号: {signal}")

    return output


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


async def execute_macd(node: Dict, context: ExecutionContext) -> Any:
    """MACD指标节点 - 真实计算"""
    config = node.get("config", {})
    inst_id = config.get("inst_id", "BTC-USDT")
    fast = config.get("fast_period", 12)
    slow = config.get("slow_period", 26)
    signal = config.get("signal_period", 9)
    bar = config.get("bar", "1H")

    candles_key = f"{inst_id}_candles_{bar}"
    candles = context.variables.get(candles_key)

    if not candles:
        raise Exception(f"未找到 {inst_id} 的K线数据")

    logger.info(f"[TA-Lib] 计算 {inst_id} MACD({fast},{slow},{signal})")

    closes = to_numpy_array([c["close"] for c in candles])

    # 计算MACD
    macd, macd_signal, macd_hist = talib.MACD(
        closes, fastperiod=fast, slowperiod=slow, signalperiod=signal
    )

    current_macd = macd[-1]
    current_signal = macd_signal[-1]
    current_hist = macd_hist[-1]

    # 确定信号
    if np.isnan(current_macd) or np.isnan(current_signal):
        macd_signal_type = "insufficient_data"
        crossover = None
    else:
        # 金叉/死叉检测
        prev_macd = macd[-2] if len(macd) > 1 else current_macd
        prev_signal = macd_signal[-2] if len(macd_signal) > 1 else current_signal

        if prev_macd < prev_signal and current_macd > current_signal:
            crossover = "golden"  # 金叉
            macd_signal_type = "bullish"
        elif prev_macd > prev_signal and current_macd < current_signal:
            crossover = "death"  # 死叉
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
        "signal": round(float(current_signal), 4)
        if not np.isnan(current_signal)
        else None,
        "histogram": round(float(current_hist), 4)
        if not np.isnan(current_hist)
        else None,
        "crossover": crossover,
        "trend": macd_signal_type,
        "interpretation": _interpret_macd(
            current_macd, current_signal, current_hist, crossover
        ),
    }

    context.variables[f"{inst_id}_macd"] = output
    logger.info(
        f"[TA-Lib] MACD: {output['macd']}, Signal: {output['signal']}, 趋势: {macd_signal_type}"
    )

    return output


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


async def execute_bollinger(node: Dict, context: ExecutionContext) -> Any:
    """布林带节点 - 真实计算"""
    config = node.get("config", {})
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 20)
    std_dev = config.get("std_dev", 2)
    bar = config.get("bar", "1H")

    candles_key = f"{inst_id}_candles_{bar}"
    candles = context.variables.get(candles_key)

    if not candles:
        raise Exception(f"未找到 {inst_id} 的K线数据")

    logger.info(f"[TA-Lib] 计算 {inst_id} Bollinger Bands({period},{std_dev})")

    closes = to_numpy_array([c["close"] for c in candles])

    # 计算布林带
    upper, middle, lower = talib.BBANDS(
        closes,
        timeperiod=period,
        nbdevup=std_dev,
        nbdevdn=std_dev,
        matype=0,  # SMA
    )

    current_price = closes[-1]
    current_upper = upper[-1]
    current_middle = middle[-1]
    current_lower = lower[-1]

    # 计算带宽和%位置
    if not np.isnan(current_upper) and not np.isnan(current_lower):
        bandwidth = ((current_upper - current_lower) / current_middle) * 100
        pct_position = (
            (current_price - current_lower) / (current_upper - current_lower)
        ) * 100
    else:
        bandwidth = None
        pct_position = None

    # 确定信号
    if np.isnan(current_upper):
        signal = "insufficient_data"
    elif current_price > current_upper:
        signal = "upper_breakout"  # 突破上轨
    elif current_price < current_lower:
        signal = "lower_breakout"  # 突破下轨
    else:
        signal = "within_band"

    output = {
        "inst_id": inst_id,
        "upper": round(float(current_upper), 2)
        if not np.isnan(current_upper)
        else None,
        "middle": round(float(current_middle), 2)
        if not np.isnan(current_middle)
        else None,
        "lower": round(float(current_lower), 2)
        if not np.isnan(current_lower)
        else None,
        "current_price": round(float(current_price), 2),
        "bandwidth_pct": round(float(bandwidth), 2) if bandwidth else None,
        "percent_position": round(float(pct_position), 2) if pct_position else None,
        "signal": signal,
        "interpretation": _interpret_bollinger(
            current_price, current_upper, current_lower, signal, bandwidth
        ),
    }

    logger.info(
        f"[TA-Lib] Bollinger: Upper={output['upper']}, Lower={output['lower']}, Signal={signal}"
    )

    return output


def _interpret_bollinger(
    price: float, upper: float, lower: float, signal: str, bandwidth: float
) -> str:
    """解读布林带"""
    if np.isnan(upper):
        return "数据不足"

    interpretations = {
        "upper_breakout": f"价格({price:.2f})突破布林带上轨({upper:.2f})，超买信号",
        "lower_breakout": f"价格({price:.2f})突破布林带下轨({lower:.2f})，超卖信号",
        "within_band": f"价格({price:.2f})在布林带内，波动率: {bandwidth:.1f}%",
    }
    return interpretations.get(signal, "未知信号")


async def execute_ma(node: Dict, context: ExecutionContext) -> Any:
    """移动平均线节点 - 真实计算"""
    config = node.get("config", {})
    inst_id = config.get("inst_id", "BTC-USDT")
    period = config.get("period", 20)
    ma_type = config.get("ma_type", "SMA")  # SMA, EMA, WMA
    bar = config.get("bar", "1H")

    candles_key = f"{inst_id}_candles_{bar}"
    candles = context.variables.get(candles_key)

    if not candles:
        raise Exception(f"未找到 {inst_id} 的K线数据")

    logger.info(f"[TA-Lib] 计算 {inst_id} {ma_type}({period})")

    closes = to_numpy_array([c["close"] for c in candles])

    # 根据类型计算均线
    if ma_type == "SMA":
        ma_values = talib.SMA(closes, timeperiod=period)
    elif ma_type == "EMA":
        ma_values = talib.EMA(closes, timeperiod=period)
    elif ma_type == "WMA":
        ma_values = talib.WMA(closes, timeperiod=period)
    else:
        ma_values = talib.SMA(closes, timeperiod=period)

    current_ma = ma_values[-1]
    current_price = closes[-1]

    # 判断趋势
    if np.isnan(current_ma):
        trend = "insufficient_data"
    elif current_price > current_ma:
        trend = "above"  # 价格在均线上方
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
        if not np.isnan(current_ma)
        else None,
    }

    logger.info(
        f"[TA-Lib] {ma_type}: {output['ma_value']}, Price: {output['current_price']}"
    )

    return output
