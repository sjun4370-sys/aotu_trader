"""
RSI 超买超卖策略
RSI低于超卖阈值时买入，高于超买阈值时卖出
"""

from typing import Optional, Literal
from .base import Strategy, Signal


class RSIStrategy(Strategy):
    """RSI 超买超卖策略"""

    def __init__(
        self,
        inst_id: str = "BTC-USDT",
        period: str = "1H",
        position_size: float = 0.001,
        rsi_oversold: float = 30,
        rsi_overbought: float = 70,
    ):
        """
        Args:
            inst_id: 交易对ID
            period: K线周期
            position_size: 交易数量
            rsi_oversold: RSI超卖阈值（默认30）
            rsi_overbought: RSI超买阈值（默认70）
        """
        super().__init__(inst_id, period, position_size)
        self.rsi_oversold = rsi_oversold
        self.rsi_overbought = rsi_overbought

    def generate_signal(self, indicators: dict) -> Signal:
        """
        根据RSI生成信号

        Args:
            indicators: 包含 'rsi' 和 'price' 的字典

        Returns:
            Signal: BUY (RSI < 超卖), SELL (RSI > 超买), HOLD
        """
        rsi = indicators.get("rsi")

        if rsi is None:
            return Signal.HOLD

        if rsi < self.rsi_oversold:
            return Signal.BUY
        elif rsi > self.rsi_overbought:
            return Signal.SELL
        else:
            return Signal.HOLD
