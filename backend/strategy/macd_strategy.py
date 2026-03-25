"""
MACD 金叉死叉策略
MACD线上穿信号线买入，下穿卖出
"""

from .base import Strategy, Signal


class MACDStrategy(Strategy):
    """MACD 金叉死叉策略"""

    def __init__(
        self,
        inst_id: str = "BTC-USDT",
        period: str = "1H",
        position_size: float = 0.001,
    ):
        super().__init__(inst_id, period, position_size)

    def generate_signal(self, indicators: dict) -> Signal:
        """
        根据MACD生成信号

        Args:
            indicators: 包含 'macd', 'signal', 'histogram' 的字典

        Returns:
            Signal: BUY (金叉), SELL (死叉), HOLD
        """
        macd = indicators.get("macd")
        signal = indicators.get("signal")
        histogram = indicators.get("histogram")

        if macd is None or signal is None or histogram is None:
            return Signal.HOLD

        # MACD > Signal 线，且histogram由负转正（简单判断）
        if histogram > 0:
            return Signal.BUY
        elif histogram < 0:
            return Signal.SELL
        else:
            return Signal.HOLD
