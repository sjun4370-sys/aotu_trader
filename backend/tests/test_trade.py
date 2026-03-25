import pytest
from okx_api.trade import TradeAPI
from okx_api.config import OKXConfig

def test_trade_api_init():
    config = OKXConfig(flag="1")
    api = TradeAPI(config)
    assert api.config == config

def test_trade_api_with_auth():
    config = OKXConfig(
        api_key="test_key",
        secret_key="test_secret",
        passphrase="test_pass",
        flag="1"
    )
    api = TradeAPI(config)
    assert api.config.needs_auth == True

def test_parse_response_success():
    response = {"code": "0", "data": [{"ordId": "123"}]}
    success, data = TradeAPI.parse_response(response)
    assert success == True
    assert data == [{"ordId": "123"}]

def test_parse_response_failure():
    response = {"code": "1", "msg": "Error"}
    success, data = TradeAPI.parse_response(response)
    assert success == False
    assert data == "Error"