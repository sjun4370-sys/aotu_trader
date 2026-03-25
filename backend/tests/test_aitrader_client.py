"""LLM 客户端测试"""

import pytest
from unittest.mock import patch, MagicMock
from aitrader.client import LLMClient
from aitrader.config import AIConfig
from aitrader.types import TradeCommand, TradeAction


def test_llm_client_init():
    """客户端可以初始化"""
    client = LLMClient()
    assert client.config is not None


def test_llm_client_parse_response_valid_json():
    """解析有效的 JSON 响应"""
    client = LLMClient()
    response = client._parse_response('{"action": "buy", "reason": "RSI超卖", "confidence": 0.8}')

    assert response.action == TradeAction.BUY
    assert response.reason == "RSI超卖"
    assert response.confidence == 0.8


def test_llm_client_parse_response_invalid_json():
    """解析无效 JSON 返回 HOLD"""
    client = LLMClient()
    response = client._parse_response("这不是有效的 JSON")

    assert response.action == TradeAction.HOLD
    assert response.confidence == 0.0


def test_llm_client_parse_response_invalid_action():
    """无效 action 默认为 HOLD"""
    client = LLMClient()
    response = client._parse_response('{"action": "invalid", "reason": "测试", "confidence": 0.5}')

    assert response.action == TradeAction.HOLD


def test_llm_client_parse_response_with_code_block():
    """解析带代码块的响应"""
    client = LLMClient()
    response = client._parse_response('```json\n{"action": "sell", "reason": "测试", "confidence": 0.7}\n```')

    assert response.action == TradeAction.SELL
    assert response.confidence == 0.7
