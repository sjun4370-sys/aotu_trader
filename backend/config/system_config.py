"""
系统初始化配置
"""

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class SystemConfig:
    """系统配置"""

    # OKX配置
    okx_api_key: str = ""
    okx_secret_key: str = ""
    okx_passphrase: str = ""
    okx_flag: str = "1"  # "1" = 模拟盘, "0" = 实盘

    # LLM配置
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    llm_provider: str = "claude"  # claude 或 openai
    llm_model: str = "claude-3-sonnet-20240229"

    # 风险控制
    max_loss_pct: float = 0.05  # 最大亏损5%
    max_position_pct: float = 0.3  # 最大仓位30%

    # 交易配置
    default_trade_mode: str = "cash"  # cash(现货) / cross(合约全仓)
    min_order_value: float = 10.0  # 最小订单价值(USDT)

    @classmethod
    def from_env(cls) -> "SystemConfig":
        """从环境变量加载配置"""
        return cls(
            okx_api_key=os.getenv("OKX_API_KEY", ""),
            okx_secret_key=os.getenv("OKX_SECRET_KEY", ""),
            okx_passphrase=os.getenv("OKX_PASSPHRASE", ""),
            okx_flag=os.getenv("OKX_FLAG", "1"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            llm_provider=os.getenv("LLM_PROVIDER", "claude"),
            llm_model=os.getenv("LLM_MODEL", "claude-3-sonnet-20240229"),
            max_loss_pct=float(os.getenv("MAX_LOSS_PCT", "0.05")),
            max_position_pct=float(os.getenv("MAX_POSITION_PCT", "0.3")),
        )

    def is_configured(self) -> bool:
        """检查配置是否完整"""
        return all([self.okx_api_key, self.okx_secret_key, self.okx_passphrase])

    def to_okx_config(self):
        """转换为OKX配置"""
        from okx_api.config import OKXConfig

        return OKXConfig(
            api_key=self.okx_api_key,
            secret_key=self.okx_secret_key,
            passphrase=self.okx_passphrase,
            flag=self.okx_flag,
        )


# 全局配置实例
system_config = SystemConfig.from_env()
