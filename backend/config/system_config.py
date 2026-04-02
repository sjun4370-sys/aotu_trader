"""
系统配置 - 从 .env 文件加载
"""

import os
from dataclasses import dataclass


def _load_env():
    """解析 .env 文件"""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    values = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    values[key.strip()] = val.strip().strip("\"'")
    return values


_env = _load_env()


@dataclass
class SystemConfig:
    okx_api_key: str = ""
    okx_secret_key: str = ""
    okx_passphrase: str = ""
    okx_flag: str = "1"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_provider: str = "anthropic"
    llm_model: str = "MiniMax-M2.7-highspeed"
    max_loss_pct: float = 0.05
    max_position_pct: float = 0.3

    @classmethod
    def from_env(cls):
        return cls(
            okx_api_key=_env.get("api_key", ""),
            okx_secret_key=_env.get("secret_key", ""),
            okx_passphrase=_env.get("passphrase", ""),
            okx_flag=_env.get("flag", "1"),
            anthropic_api_key=_env.get("anthropic_api_key", ""),
            openai_api_key=_env.get("openai_api_key", ""),
            llm_provider=_env.get("llm_provider", "anthropic"),
            llm_model=_env.get("anthropic_model", "MiniMax-M2.7-highspeed"),
            max_loss_pct=float(_env.get("max_loss_pct", "0.05")),
            max_position_pct=float(_env.get("max_position_pct", "0.3")),
        )

    def is_configured(self):
        return bool(self.okx_api_key and self.okx_secret_key and self.okx_passphrase)

    def has_llm_config(self):
        return bool(self.anthropic_api_key or self.openai_api_key)

    def to_okx_config(self):
        from okx_api.config import OKXConfig
        return OKXConfig(
            api_key=self.okx_api_key,
            secret_key=self.okx_secret_key,
            passphrase=self.okx_passphrase,
            flag=self.okx_flag,
        )


system_config = SystemConfig.from_env()
