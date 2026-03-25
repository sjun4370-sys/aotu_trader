"""AI 交易配置管理"""

import os
from dataclasses import dataclass
from typing import Literal, Optional


@dataclass
class AIConfig:
    """AI 交易配置"""
    # LLM 提供者: "anthropic" 或 "openai"
    provider: Literal["anthropic", "openai"] = "anthropic"

    # Anthropic API 配置
    anthropic_api_key: str = ""
    anthropic_base_url: str = ""  # 可选，自定义API地址
    anthropic_model: str = "claude-sonnet-4-20250514"

    # OpenAI API 配置
    openai_api_key: str = ""
    openai_base_url: str = ""  # 可选，自定义API地址
    openai_model: str = "gpt-4o"

    # 通用配置
    max_tokens: int = 1024
    temperature: float = 0.7

    @classmethod
    def from_env(cls, path: str = ".env") -> "AIConfig":
        """从 .env 文件加载配置"""
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

                    if key == "anthropic_api_key":
                        config.anthropic_api_key = value
                    elif key == "anthropic_base_url":
                        config.anthropic_base_url = value
                    elif key == "anthropic_model":
                        config.anthropic_model = value
                    elif key == "openai_api_key":
                        config.openai_api_key = value
                    elif key == "openai_base_url":
                        config.openai_base_url = value
                    elif key == "openai_model":
                        config.openai_model = value
                    elif key == "llm_provider":
                        if value in ("anthropic", "openai"):
                            config.provider = value
                    elif key == "llm_max_tokens":
                        config.max_tokens = int(value) if value.isdigit() else 1024
                    elif key == "llm_temperature":
                        config.temperature = float(value) if value.replace(".", "").isdigit() else 0.7

        return config