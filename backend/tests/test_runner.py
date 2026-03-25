import pytest
from strategy.runner import StrategyRunner
from strategy.rsi_strategy import RSIStrategy, Signal


def test_runner_init():
    """策略运行器可以被实例化"""
    strategy = RSIStrategy(inst_id="BTC-USDT")
    runner = StrategyRunner(strategy)
    assert runner.strategy == strategy


def test_runner_run_buy_signal():
    """运行器生成买入订单参数"""
    strategy = RSIStrategy(inst_id="BTC-USDT", position_size=0.001)
    runner = StrategyRunner(strategy)

    indicators = {"rsi": 25, "price": 50000}
    params = runner.run(indicators)

    assert params is not None
    assert params["instId"] == "BTC-USDT"
    assert params["side"] == "buy"
    assert params["sz"] == "0.001"


def test_runner_run_sell_signal():
    """运行器生成卖出订单参数"""
    strategy = RSIStrategy(inst_id="ETH-USDT", position_size=0.002)
    runner = StrategyRunner(strategy)

    indicators = {"rsi": 75, "price": 3000}
    params = runner.run(indicators)

    assert params is not None
    assert params["instId"] == "ETH-USDT"
    assert params["side"] == "sell"
    assert params["sz"] == "0.002"


def test_runner_run_hold_signal():
    """持有信号返回None"""
    strategy = RSIStrategy(inst_id="BTC-USDT")
    runner = StrategyRunner(strategy)

    indicators = {"rsi": 50, "price": 50000}
    params = runner.run(indicators)

    assert params is None


def test_runner_get_signal():
    """运行器可以单独获取信号"""
    strategy = RSIStrategy(rsi_oversold=30, rsi_overbought=70)
    runner = StrategyRunner(strategy)

    indicators = {"rsi": 25, "price": 50000}
    signal = runner.get_signal(indicators)

    assert signal == Signal.BUY
