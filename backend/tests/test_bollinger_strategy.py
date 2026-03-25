import pytest
from strategy.bollinger_strategy import BollingerStrategy, Signal


def test_bollinger_strategy_init():
    strategy = BollingerStrategy(inst_id="BTC-USDT", period="1H")
    assert strategy.inst_id == "BTC-USDT"


def test_bollinger_strategy_buy_signal():
    """价格触及布林带下轨时买入"""
    strategy = BollingerStrategy()
    indicators = {
        "price": 45000,
        "bb_upper": 55000,
        "bb_lower": 45000,  # price <= bb_lower
        "bb_middle": 50000,
    }
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.BUY


def test_bollinger_strategy_sell_signal():
    """价格触及布林带上轨时卖出"""
    strategy = BollingerStrategy()
    indicators = {
        "price": 55000,
        "bb_upper": 55000,  # price >= bb_upper
        "bb_lower": 45000,
        "bb_middle": 50000,
    }
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.SELL


def test_bollinger_strategy_hold_signal():
    """价格在布林带中轨附近时持有"""
    strategy = BollingerStrategy()
    indicators = {
        "price": 50000,
        "bb_upper": 55000,
        "bb_lower": 45000,
        "bb_middle": 50000,
    }
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.HOLD
