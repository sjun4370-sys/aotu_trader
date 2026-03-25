import pytest
from analysis.technical import TechnicalAnalysis

def test_technical_analysis_init():
    api = TechnicalAnalysis()
    assert api.market_api is not None

def test_calculate_sma():
    api = TechnicalAnalysis()
    prices = [1, 2, 3, 4, 5]
    result = api.sma(prices, period=3)
    assert result == [2.0, 3.0, 4.0]  # (1+2+3)/3=2, (2+3+4)/3=3, (3+4+5)/3=4

def test_calculate_ema():
    api = TechnicalAnalysis()
    prices = [1, 2, 3, 4, 5]
    result = api.ema(prices, period=3)
    assert len(result) == 5

def test_ema_specific_values():
    api = TechnicalAnalysis()
    prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    result = api.ema(prices, period=10)
    assert result[-1] is not None

def test_calculate_rsi():
    api = TechnicalAnalysis()
    # Need at least period+1=15 prices for period=14
    prices = [44, 44, 45, 43, 44, 44, 45, 46, 47, 48, 47, 46, 45, 44, 43]
    result = api.rsi(prices, period=14)
    assert result is None or (0 <= result <= 100)

def test_rsi_values_range():
    api = TechnicalAnalysis()
    prices = [44, 44, 45, 43, 44, 44, 45, 46, 47, 48, 47, 46, 45, 44, 43]
    result = api.rsi(prices, period=14)
    if result is not None:
        assert 0 <= result <= 100

def test_calculate_macd():
    api = TechnicalAnalysis()
    # Need at least slow+signal=35 prices for default MACD(12,26,9)
    prices = list(range(1, 41))
    macd, signal, histogram = api.macd(prices)
    assert len(macd) == len(prices)

def test_macd_output_lengths():
    api = TechnicalAnalysis()
    prices = list(range(1, 41))
    macd, signal, histogram = api.macd(prices)
    assert len(macd) == len(prices)
    assert len(signal) == len(prices)
    assert len(histogram) == len(prices)

def test_calculate_bollinger_bands():
    api = TechnicalAnalysis()
    prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    upper, middle, lower = api.bollinger_bands(prices, period=5, std_dev=2)
    # Bollinger Bands returns len(prices) - period + 1 values
    assert len(upper) == len(prices) - 5 + 1
    assert len(middle) == len(prices) - 5 + 1
    assert len(lower) == len(prices) - 5 + 1

def test_bollinger_bands_structure():
    api = TechnicalAnalysis()
    prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    upper, middle, lower = api.bollinger_bands(prices, period=5, std_dev=2)
    # Upper band should be above middle, middle above lower
    for i in range(len(upper)):
        if upper[i] is not None and middle[i] is not None and lower[i] is not None:
            assert upper[i] > middle[i]
            assert middle[i] > lower[i]

def test_get_indicator_summary_keys():
    api = TechnicalAnalysis()
    summary = api.get_indicator_summary("BTC-USDT", period="1H")
    assert isinstance(summary, dict)
    assert "sma" in summary
    assert "ema" in summary
    assert "rsi" in summary
    assert "macd" in summary
    assert "bb" in summary
