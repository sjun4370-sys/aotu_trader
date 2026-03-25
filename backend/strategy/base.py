"""
基础策略类
所有策略都必须继承此基类
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Literal


class Signal(Enum):
    """交易信号"""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class Strategy(ABC):
    """交易策略基类"""

    def __init__(
        self,
        inst_id: str,
        period: str = "1H",
        position_size: float = 0.001,
    ):
        """
        Args:
            inst_id: 交易对ID（如 "BTC-USDT"）
            period: K线周期（如 "1H", "4H", "1D"）
            position_size: 每次交易的数量
        """
        self.inst_id = inst_id
        self.period = period
        self.position_size = position_size

    @abstractmethod
    def generate_signal(self, indicators: dict) -> Signal:
        """
        根据技术指标生成交易信号

        Args:
            indicators: 技术指标字典，包含:
                - price: 当前价格
                - rsi: RSI值
                - macd: MACD线
                - signal: 信号线
                - histogram: MACD柱状图
                - sma: SMA值
                - ema: EMA值
                - bb_upper: 布林带上轨
                - bb_lower: 布林带下轨

        Returns:
            Signal: BUY, SELL, 或 HOLD
        """
        pass

    def get_order_params(self, signal: Signal, side: str = None) -> dict:
        """
        根据信号获取订单参数

        Args:
            signal: 交易信号
            side: 交易方向（可选）

        Returns:
            dict: 订单参数，包含 instId, tdMode, side, sz
        """
        if signal == Signal.HOLD:
            return None

        order_side = side if side else ("buy" if signal == Signal.BUY else "sell")

        return {
            "instId": self.inst_id,
            "tdMode": "cash",
            "side": order_side,
            "sz": str(self.position_size),
        }
