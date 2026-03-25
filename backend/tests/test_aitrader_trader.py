"""AI 交易核心类测试"""

import pytest
from unittest.mock import MagicMock
from aitrader.trader import AITrader
from aitrader.config import AIConfig
from aitrader.types import TradeCommand, TradeAction


def test_aitrader_init():
    """AITrader 可以初始化"""
    trader = AITrader()
    assert trader.config is not None
    assert trader.client is not None


def test_aitrader_init_with_custom_config():
    """使用自定义配置初始化"""
    config = AIConfig(provider="anthropic")
    trader = AITrader(config=config)
    assert trader.config == config


def test_aitrader_init_with_mock_client():
    """使用模拟客户端初始化"""
    mock_client = MagicMock()
    mock_client.analyze_trade.return_value = TradeCommand(
        action=TradeAction.BUY,
        reason="测试买入",
        confidence=0.8,
    )
    trader = AITrader(client=mock_client)

    market_data = {"inst_id": "BTC-USDT", "price": 50000}
    indicators = {"rsi": 30}
    result = trader.analyze(market_data, indicators)

    assert result.action == TradeAction.BUY
    mock_client.analyze_trade.assert_called_once()


def test_aitrader_should_trade_true():
    """置信度高时返回 True"""
    mock_client = MagicMock()
    mock_client.analyze_trade.return_value = TradeCommand(
        action=TradeAction.BUY,
        reason="测试",
        confidence=0.8,
    )
    trader = AITrader(client=mock_client)

    assert trader.should_trade(
        market_data={"inst_id": "BTC-USDT", "price": 50000},
        indicators={},
        min_confidence=0.6,
    )


def test_aitrader_should_trade_false_low_confidence():
    """置信度低时返回 False"""
    mock_client = MagicMock()
    mock_client.analyze_trade.return_value = TradeCommand(
        action=TradeAction.BUY,
        reason="测试",
        confidence=0.3,
    )
    trader = AITrader(client=mock_client)

    assert not trader.should_trade(
        market_data={"inst_id": "BTC-USDT", "price": 50000},
        indicators={},
        min_confidence=0.6,
    )


def test_aitrader_should_trade_false_hold():
    """HOLD 信号返回 False"""
    mock_client = MagicMock()
    mock_client.analyze_trade.return_value = TradeCommand(
        action=TradeAction.HOLD,
        reason="市场不明确",
        confidence=0.5,
    )
    trader = AITrader(client=mock_client)

    assert not trader.should_trade(
        market_data={"inst_id": "BTC-USDT", "price": 50000},
        indicators={},
    )
