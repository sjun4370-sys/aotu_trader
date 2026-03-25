import pytest
from strategy.base import Signal
from strategy.rsi_strategy import RSIStrategy


def test_signal_enum():
    assert Signal.BUY.value == "buy"
    assert Signal.SELL.value == "sell"
    assert Signal.HOLD.value == "hold"


def test_strategy_init():
    """策略子类可以被实例化"""
    strategy = RSIStrategy(inst_id="BTC-USDT", period="1H")
    assert strategy.inst_id == "BTC-USDT"
    assert strategy.period == "1H"


def test_get_order_params_buy():
    """买入信号生成正确的订单参数"""
    strategy = RSIStrategy(inst_id="BTC-USDT", position_size=0.001)
    params = strategy.get_order_params(Signal.BUY)
    assert params["instId"] == "BTC-USDT"
    assert params["side"] == "buy"
    assert params["sz"] == "0.001"


def test_get_order_params_sell():
    """卖出信号生成正确的订单参数"""
    strategy = RSIStrategy(inst_id="BTC-USDT", position_size=0.002)
    params = strategy.get_order_params(Signal.SELL)
    assert params["instId"] == "BTC-USDT"
    assert params["side"] == "sell"
    assert params["sz"] == "0.002"


def test_get_order_params_hold():
    """持有信号返回None"""
    strategy = RSIStrategy(inst_id="BTC-USDT")
    params = strategy.get_order_params(Signal.HOLD)
    assert params is None
