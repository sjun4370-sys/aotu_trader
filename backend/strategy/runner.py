"""
策略运行器
根据市场数据运行策略并生成订单参数
"""

from typing import Optional, Dict, Any
from .base import Strategy, Signal


class StrategyRunner:
    """策略运行器"""

    def __init__(self, strategy: Strategy):
        """
        Args:
            strategy: 策略实例
        """
        self.strategy = strategy

    def run(self, indicators: dict) -> Optional[Dict[str, Any]]:
        """
        运行策略并生成订单参数

        Args:
            indicators: 技术指标数据字典

        Returns:
            订单参数字典，如果信号为HOLD则返回None
        """
        signal = self.strategy.generate_signal(indicators)
        return self.strategy.get_order_params(signal)

    def get_signal(self, indicators: dict) -> Signal:
        """
        获取信号而不生成订单参数

        Args:
            indicators: 技术指标数据字典

        Returns:
            Signal: 信号类型
        """
        return self.strategy.generate_signal(indicators)
