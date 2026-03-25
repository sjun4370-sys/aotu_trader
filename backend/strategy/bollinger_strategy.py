"""
布林带策略
价格触及下轨买入，触及上轨卖出
"""

from .base import Strategy, Signal


class BollingerStrategy(Strategy):
    """布林带策略"""

    def __init__(
        self,
        inst_id: str = "BTC-USDT",
        period: str = "1H",
        position_size: float = 0.001,
    ):
        super().__init__(inst_id, period, position_size)

    def generate_signal(self, indicators: dict) -> Signal:
        """
        根据布林带生成信号

        Args:
            indicators: 包含 'price', 'bb_upper', 'bb_lower', 'bb_middle' 的字典

        Returns:
            Signal: BUY (价格触及下轨), SELL (价格触及上轨), HOLD
        """
        price = indicators.get("price")
        bb_upper = indicators.get("bb_upper")
        bb_lower = indicators.get("bb_lower")

        if price is None or bb_upper is None or bb_lower is None:
            return Signal.HOLD

        # 价格触及或跌破下轨
        if price <= bb_lower:
            return Signal.BUY
        # 价格触及或突破上轨
        elif price >= bb_upper:
            return Signal.SELL
        else:
            return Signal.HOLD
