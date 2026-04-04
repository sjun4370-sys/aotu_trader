"""
Market Data API 模块
获取市场数据: K线、订单簿、成交记录、Ticker等
"""

import okx.MarketData as MarketData
import okx.PublicData as PublicData
from typing import Optional, Literal, Any


class MarketAPI:
    """OKX 市场数据 API"""

    def __init__(self, flag: Literal["0", "1"] = "1", proxy: Optional[str] = None):
        """
        Args:
            flag: "0" = 实盘, "1" = 模拟盘
            proxy: 代理地址，如 "http://127.0.0.1:7890"
        """
        self.flag = flag
        self.market_api = MarketData.MarketAPI(flag=flag, proxy=proxy)
        self.public_api = PublicData.PublicAPI(flag=flag)

    # ==================== MarketData API ====================

    def get_candles(
        self,
        inst_id: str,
        bar: str = "1H",
        limit: int = 100,
        before: Optional[int] = None,
        after: Optional[int] = None,
    ) -> dict:
        """获取K线数据"""
        params = {
            "instId": inst_id,
            "bar": bar,
            "limit": str(limit),
        }
        if before:
            params["before"] = str(before)
        if after:
            params["after"] = str(after)
        return self.market_api.get_candlesticks(**params)

    def get_history_candles(
        self,
        inst_id: str,
        bar: str = "1H",
        limit: int = 100,
    ) -> dict:
        """获取历史K线(适用主流币种)"""
        return self.market_api.get_history_candlesticks(
            instId=inst_id, bar=bar, limit=str(limit)
        )

    def get_ticker(self, inst_id: str) -> dict:
        """获取指定合约ticker"""
        return self.market_api.get_ticker(instId=inst_id)

    def get_tickers(self, inst_type: str, uly: Optional[str] = None) -> dict:
        """获取所有合约ticker"""
        params = {"instType": inst_type}
        if uly:
            params["uly"] = uly
        return self.market_api.get_tickers(**params)

    def get_orderbook(self, inst_id: str, sz: int = 20) -> dict:
        """获取订单簿(最大400档)"""
        return self.market_api.get_orderbook(instId=inst_id, sz=str(sz))

    def get_trades(self, inst_id: str, limit: int = 100) -> dict:
        """获取近期成交"""
        return self.market_api.get_trades(instId=inst_id, limit=str(limit))

    # ==================== PublicData API ====================

    def get_instruments(
        self,
        inst_type: str,
        inst_id: Optional[str] = None,
        uly: Optional[str] = None,
    ) -> dict:
        """获取可交易合约"""
        params = {"instType": inst_type}
        if inst_id:
            params["instId"] = inst_id
        if uly:
            params["uly"] = uly
        return self.public_api.get_instruments(**params)

    def get_currencies(self) -> dict:
        """获取币种信息"""
        return self.public_api.get_currencies()

    # ==================== 快捷方法 ====================

    @staticmethod
    def parse_response(response: dict) -> tuple[bool, Any]:
        """解析API响应"""
        if response.get("code") == "0":
            return True, response.get("data", [])
        return False, response.get("msg", "Unknown error")

    def get_spot_price(self, inst_id: str) -> Optional[float]:
        """获取现货最新价"""
        result = self.get_ticker(inst_id)
        success, data = self.parse_response(result)
        if success and data:
            try:
                return float(data[0].get("last", 0))
            except (ValueError, IndexError):
                return None
        return None

    def get_market_summary(self, inst_id: str) -> Optional[dict]:
        """获取市场摘要"""
        result = self.get_ticker(inst_id)
        success, data = self.parse_response(result)
        if success and data:
            ticker = data[0]
            return {
                "inst_id": ticker.get("instId"),
                "last": float(ticker.get("last", 0)),
                "open_24h": float(ticker.get("open24h", 0)),
                "high_24h": float(ticker.get("high24h", 0)),
                "low_24h": float(ticker.get("low24h", 0)),
                "vol_24h": float(ticker.get("vol24h", 0)),
                "bid": float(ticker.get("bidPx", 0)) if ticker.get("bidPx") else None,
                "ask": float(ticker.get("askPx", 0)) if ticker.get("askPx") else None,
                "ts": ticker.get("ts"),
            }
        return None