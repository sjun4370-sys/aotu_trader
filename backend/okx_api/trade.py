"""
Trade API 模块
交易操作: 下单、撤单、改单、查询订单等
"""

import okx.Trade as Trade
from typing import Optional, Literal, Any
from .config import OKXConfig


class TradeAPI:
    """OKX 交易 API"""

    def __init__(self, config: OKXConfig):
        """
        Args:
            config: OKXConfig 配置实例
        """
        self.config = config
        if config.needs_auth:
            self.trade_api = Trade.TradeAPI(
                config.api_key,
                config.secret_key,
                config.passphrase,
                config.is_demo,
                config.flag,
            )
        else:
            self.trade_api = Trade.TradeAPI(
                "",
                "",
                "",
                True,
                config.flag,
            )

    def place_order(
        self,
        instId: str,
        tdMode: Literal["cash", "cross", "isolated"],
        side: Literal["buy", "sell"],
        ordType: Literal["market", "limit"],
        sz: str,
        px: Optional[str] = None,
        posSide: Optional[Literal["long", "short", "net"]] = None,
        clOrdId: Optional[str] = None,
    ) -> dict:
        """
        通用下单方法

        Args:
            instId: 合约ID, 如 "BTC-USDT"
            tdMode: 交易模式, "cash"(现货), "cross"(全仓), "isolated"(逐仓)
            side: 方向, "buy" 或 "sell"
            ordType: 订单类型, "market" 或 "limit"
            sz: 数量
            px: 价格(限价单必需)
            posSide: 持仓方向(合约必需), "long", "short", "net"
            clOrdId: 客户端订单ID(可选)

        Returns:
            API响应字典
        """
        params = {
            "instId": instId,
            "tdMode": tdMode,
            "side": side,
            "ordType": ordType,
            "sz": sz,
        }
        if px:
            params["px"] = px
        if posSide:
            params["posSide"] = posSide
        if clOrdId:
            params["clOrdId"] = clOrdId

        return self.trade_api.place_order(**params)

    def place_market_order(
        self,
        instId: str,
        tdMode: Literal["cash", "cross", "isolated"],
        side: Literal["buy", "sell"],
        sz: str,
        posSide: Optional[Literal["long", "short", "net"]] = None,
    ) -> dict:
        """市价下单"""
        return self.place_order(
            instId=instId,
            tdMode=tdMode,
            side=side,
            ordType="market",
            sz=sz,
            posSide=posSide,
        )

    def place_limit_order(
        self,
        instId: str,
        tdMode: Literal["cash", "cross", "isolated"],
        side: Literal["buy", "sell"],
        px: str,
        sz: str,
        posSide: Optional[Literal["long", "short", "net"]] = None,
    ) -> dict:
        """限价下单"""
        return self.place_order(
            instId=instId,
            tdMode=tdMode,
            side=side,
            ordType="limit",
            sz=sz,
            px=px,
            posSide=posSide,
        )

    def cancel_order(self, instId: str, ordId: str, clOrdId: Optional[str] = None) -> dict:
        """撤单"""
        return self.trade_api.cancel_order(instId=instId, ordId=ordId, clOrdId=clOrdId)

    def amend_order(
        self,
        instId: str,
        ordId: str,
        newPx: Optional[str] = None,
        newSz: Optional[str] = None,
    ) -> dict:
        """改单"""
        return self.trade_api.amend_order(instId=instId, ordId=ordId, newPx=newPx, newSz=newSz)

    def get_order(self, instId: str, ordId: str, clOrdId: Optional[str] = None) -> dict:
        """查询订单详情"""
        return self.trade_api.get_order(instId=instId, ordId=ordId, clOrdId=clOrdId)

    def get_order_list(self, instType: Optional[str] = None) -> dict:
        """查询当前挂单"""
        return self.trade_api.get_order_list(instType=instType)

    def get_orders_history(
        self,
        instType: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 100,
    ) -> dict:
        """查询订单历史(最近7天)"""
        return self.trade_api.get_orders_history(
            instType=instType, state=state, limit=str(limit)
        )

    @staticmethod
    def parse_response(response: dict) -> tuple[bool, list | str]:
        """解析API响应"""
        if response.get("code") == "0":
            return True, response.get("data", [])
        return False, response.get("msg", "Unknown error")