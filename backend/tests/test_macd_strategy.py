import pytest
from strategy.macd_strategy import MACDStrategy, Signal


def test_macd_strategy_init():
    strategy = MACDStrategy(inst_id="BTC-USDT", period="1H")
    assert strategy.inst_id == "BTC-USDT"


def test_macd_strategy_buy_signal():
    """MACD金叉（MACD线从下方穿越信号线）时买入"""
    strategy = MACDStrategy()
    # histgram由负转正表示金叉
    indicators = {
        "macd": 100,
        "signal": 50,
        "histogram": 50,  # MACD > Signal
        "price": 50000
    }
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.BUY


def test_macd_strategy_sell_signal():
    """MACD死叉（MACD线从上方穿越信号线）时卖出"""
    strategy = MACDStrategy()
    indicators = {
        "macd": 50,
        "signal": 100,
        "histogram": -50,  # MACD < Signal
        "price": 50000
    }
    signal = strategy.generate_signal(indicators)
    assert signal == Signal.SELL
