"""
技术分析模块
基于K线数据计算技术指标
"""

import math
from typing import Optional, Literal, Tuple
from okx_api.market import MarketAPI


class TechnicalAnalysis:
    """OKX 技术分析 API"""

    def __init__(self, flag: Literal["0", "1"] = "1"):
        self.market_api = MarketAPI(flag=flag)

    def sma(self, prices: list, period: int) -> list:
        """
        简单移动平均线 (SMA)
        Args:
            prices: 价格列表
            period: 周期
        Returns:
            SMA值列表
        """
        if len(prices) < period:
            return []
        result = []
        for i in range(len(prices) - period + 1):
            window = prices[i:i + period]
            result.append(sum(window) / period)
        return result

    def ema(self, prices: list, period: int) -> list:
        """
        指数移动平均线 (EMA)
        Args:
            prices: 价格列表
            period: 周期
        Returns:
            EMA值列表（前period-1个值为None）
        """
        if len(prices) < period:
            return []
        multiplier = 2 / (period + 1)
        result = [None] * (period - 1)
        result.append(sum(prices[:period]) / period)
        for i in range(period, len(prices)):
            ema_value = (prices[i] - result[-1]) * multiplier + result[-1]
            result.append(ema_value)
        return result

    def rsi(self, prices: list, period: int = 14) -> Optional[float]:
        """
        相对强弱指数 (RSI)
        Args:
            prices: 价格列表
            period: 周期（默认14）
        Returns:
            RSI值（0-100），数据不足返回None
        """
        if len(prices) < period + 1:
            return None

        gains = []
        losses = []
        for i in range(1, len(prices)):
            change = prices[i] - prices[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def macd(
        self, prices: list, fast: int = 12, slow: int = 26, signal: int = 9
    ) -> Tuple[list, list, list]:
        """
        移动平均收敛散度 (MACD)
        Args:
            prices: 价格列表
            fast: 快线EMA周期（默认12）
            slow: 慢线EMA周期（默认26）
            signal: 信号线周期（默认9）
        Returns:
            元组 (MACD线, 信号线, 柱状图)
        """
        if len(prices) < slow + signal:
            return [], [], []

        fast_ema = self.ema(prices, fast)
        slow_ema = self.ema(prices, slow)

        # MACD线 = 快线EMA - 慢线EMA
        macd = []
        for i in range(len(prices)):
            if fast_ema[i] is not None and slow_ema[i] is not None:
                macd.append(fast_ema[i] - slow_ema[i])
            else:
                macd.append(None)

        # 信号线 = MACD的EMA
        valid_macd = [m for m in macd if m is not None]
        signal_ema = self.ema(valid_macd, signal)

        signal_line = [None] * (len(macd) - len(signal_ema)) + signal_ema

        # 柱状图 = MACD - 信号线
        histogram = []
        for i in range(len(macd)):
            if macd[i] is not None and signal_line[i] is not None:
                histogram.append(macd[i] - signal_line[i])
            else:
                histogram.append(None)

        return macd, signal_line, histogram

    def bollinger_bands(
        self, prices: list, period: int = 20, std_dev: float = 2
    ) -> Tuple[list, list, list]:
        """
        布林带 (Bollinger Bands)
        Args:
            prices: 价格列表
            period: 移动平均周期（默认20）
            std_dev: 标准差倍数（默认2）
        Returns:
            元组 (上轨, 中轨/SMA, 下轨)
        """
        if len(prices) < period:
            return [], [], []

        upper = []
        middle = []
        lower = []

        for i in range(len(prices) - period + 1):
            window = prices[i:i + period]
            sma = sum(window) / period

            # 计算标准差
            variance = sum((p - sma) ** 2 for p in window) / period
            std = math.sqrt(variance)

            upper.append(sma + std_dev * std)
            middle.append(sma)
            lower.append(sma - std_dev * std)

        return upper, middle, lower

    def get_indicator_summary(
        self,
        inst_id: str,
        period: str = "1H",
        limit: int = 100,
    ) -> dict:
        """
        获取指定交易对的综合技术指标摘要
        Args:
            inst_id: 交易对ID（如 "BTC-USDT"）
            period: K线周期（如 "1H", "4H", "1D"）
            limit: 获取K线数量
        Returns:
            包含SMA、EMA、RSI、MACD、布林带的字典
        """
        # 获取K线数据
        result = self.market_api.get_candles(inst_id, bar=period, limit=limit)
        success, data = self.market_api.parse_response(result)

        if not success or not data:
            return {}

        # 提取收盘价（OKX K线格式：[时间, 开盘, 最高, 最低, 收盘, 成交量, ...]）
        closes = [float(candle[4]) for candle in data]
        closes.reverse()  # 按时间正序排列

        # 计算所有指标
        sma_20 = self.sma(closes, 20)
        ema_20 = self.ema(closes, 20)
        rsi_value = self.rsi(closes, 14)
        macd_line, signal_line, histogram = self.macd(closes)
        bb_upper, bb_middle, bb_lower = self.bollinger_bands(closes, 20, 2)

        return {
            "inst_id": inst_id,
            "period": period,
            "sma": {
                "sma20": sma_20[-1] if sma_20 else None,
            },
            "ema": {
                "ema20": ema_20[-1] if ema_20 else None,
            },
            "rsi": rsi_value,
            "macd": {
                "macd": macd_line[-1] if macd_line else None,
                "signal": signal_line[-1] if signal_line else None,
                "histogram": histogram[-1] if histogram else None,
            },
            "bb": {
                "upper": bb_upper[-1] if bb_upper else None,
                "middle": bb_middle[-1] if bb_middle else None,
                "lower": bb_lower[-1] if bb_lower else None,
            },
            "price": closes[-1] if closes else None,
        }
