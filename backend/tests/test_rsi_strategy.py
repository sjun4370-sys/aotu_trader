import pytest
from strategy.rsi_strategy import RSIStrategy, Signal


def test_rsi_strategy_init():
    strategy = RSIStrategy(inst_id="BTC-USDT", period="1H")
    assert strategy.inst_id == "BTC-USDT"
    assert strategy.rsi_oversold == 30
    assert strategy.rsi_overbought == 70


def test_rsi_strategy_buy_signal():
    """RSI低于30时应产生买入信号"""
    strategy = RSIStrategy(rsi_oversold=30, rsi_overbought=70)
    indicators = {"rsi": 25, "price": 50000}
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.BUY


def test_rsi_strategy_sell_signal():
    """RSI高于70时应产生卖出信号"""
    strategy = RSIStrategy(rsi_oversold=30, rsi_overbought=70)
    indicators = {"rsi": 75, "price": 50000}
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.SELL


def test_rsi_strategy_hold_signal():
    """RSI在30-70之间时应持有"""
    strategy = RSIStrategy(rsi_oversold=30, rsi_overbought=70)
    indicators = {"rsi": 50, "price": 50000}
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.HOLD
