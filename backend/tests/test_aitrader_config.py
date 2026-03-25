"""AI 配置测试"""

import pytest
from aitrader.config import AIConfig


def test_ai_config_defaults():
    """默认配置值"""
    config = AIConfig()
    assert config.provider == "anthropic"
    assert config.anthropic_model == "claude-sonnet-4-20250514"
    assert config.openai_model == "gpt-4o"
    assert config.max_tokens == 1024
    assert config.temperature == 0.7


def test_ai_config_empty_env():
    """空 .env 文件返回默认配置"""
    config = AIConfig.from_env("nonexistent.env")
    assert config.provider == "anthropic"
    assert config.anthropic_api_key == ""
    assert config.anthropic_base_url == ""
    assert config.openai_base_url == ""