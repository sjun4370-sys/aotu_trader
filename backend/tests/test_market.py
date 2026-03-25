import pytest
from okx_api.market import MarketAPI

def test_market_api_init():
    api = MarketAPI()
    assert api.flag == "1"
    assert api.market_api is not None

def test_get_candles_returns_dict():
    api = MarketAPI()
    result = api.get_candles("BTC-USDT", bar="1H", limit=5)
    assert isinstance(result, dict)
    assert "code" in result

def test_parse_response_success():
    api = MarketAPI()
    response = {"code": "0", "data": [{"last": "50000"}]}
    success, data = api.parse_response(response)
    assert success is True
    assert data == [{"last": "50000"}]

def test_parse_response_failure():
    api = MarketAPI()
    response = {"code": "1", "msg": "Error message"}
    success, data = api.parse_response(response)
    assert success is False
    assert data == "Error message"