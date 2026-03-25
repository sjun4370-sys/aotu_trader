"""
Account API 模块
账户管理: 余额、持仓、杠杆等
"""

import okx.Account as Account
from typing import Optional, Literal, Any
from .config import OKXConfig


class AccountAPI:
    """OKX 账户 API"""

    def __init__(self, config: OKXConfig):
        """
        Args:
            config: OKXConfig 配置实例
        """
        self.config = config
        if config.needs_auth:
            self.account_api = Account.AccountAPI(
                config.api_key,
                config.secret_key,
                config.passphrase,
                config.is_demo,
                config.flag,
            )
        else:
            # 演示模式不需要真实密钥
            self.account_api = Account.AccountAPI(
                "",
                "",
                "",
                True,
                config.flag,
            )

    def get_balance(self, ccy: Optional[str] = None) -> dict:
        """
        获取账户余额

        Args:
            ccy: 币种(可选), 如 "USDT", "BTC"

        Returns:
            API响应字典
        """
        if ccy:
            return self.account_api.get_account_balance(ccy=ccy)
        return self.account_api.get_account_balance()

    def get_positions(
        self,
        inst_type: Optional[str] = None,
        inst_id: Optional[str] = None,
    ) -> dict:
        """
        获取持仓信息

        Args:
            inst_type: 合约类型, "SWAP", "FUTURES", "SPOT", "OPTION"
            inst_id: 合约ID(可选)

        Returns:
            API响应字典
        """
        return self.account_api.get_positions(instType=inst_type, instId=inst_id)

    def set_leverage(
        self,
        lever: str,
        mgnMode: Literal["cross", "isolated"],
        instId: str,
        posSide: Optional[Literal["long", "short"]] = None,
    ) -> dict:
        """
        设置杠杆

        Args:
            lever: 杠杆倍数, 如 "5", "10"
            mgnMode: 保证金模式, "cross"(全仓) 或 "isolated"(逐仓)
            instId: 合约ID, 如 "BTC-USDT-SWAP"
            posSide: 持仓方向(可选), "long" 或 "short"

        Returns:
            API响应字典
        """
        return self.account_api.set_leverage(
            lever=lever,
            mgnMode=mgnMode,
            instId=instId,
            posSide=posSide,
        )

    @staticmethod
    def parse_response(response: dict) -> tuple[bool, Any]:
        """解析API响应"""
        if response.get("code") == "0":
            return True, response.get("data", [])
        return False, response.get("msg", "Unknown error")