"""
OKX API 配置管理
"""

import os
from dataclasses import dataclass
from typing import Literal, Optional
from pathlib import Path


@dataclass
class OKXConfig:
    """OKX API 配置"""
    api_key: str = ""
    secret_key: str = ""
    passphrase: str = ""
    flag: Literal["0", "1"] = "1"  # 0=实盘, 1=模拟盘

    @property
    def is_demo(self) -> bool:
        return self.flag == "1"

    @property
    def is_live(self) -> bool:
        return self.flag == "0"

    @property
    def needs_auth(self) -> bool:
        """是否需要认证(实盘交易需要)"""
        return bool(self.api_key and self.secret_key and self.passphrase)

    @classmethod
    def from_env(cls, path: str = ".env") -> "OKXConfig":
        """
        从 .env 文件加载配置

        Args:
            path: .env 文件路径（默认 ".env"）
        """
        config = cls()

        if not os.path.exists(path):
            return config

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip()

                    if key == "api_key":
                        config.api_key = value
                    elif key == "secret_key":
                        config.secret_key = value
                    elif key == "passphrase":
                        config.passphrase = value
                    elif key == "flag":
                        config.flag = value if value in ("0", "1") else "1"

        return config

    @classmethod
    def from_json(cls, path: str) -> "OKXConfig":
        """
        从JSON文件加载配置（已弃用，请使用 from_env）

        Args:
            path: JSON配置文件路径
        """
        import json
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(
            api_key=data.get("api_key", ""),
            secret_key=data.get("secret_key", ""),
            passphrase=data.get("passphrase", ""),
            flag=data.get("flag", "1"),
        )
