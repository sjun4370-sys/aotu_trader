"""
OKX API 使用示例
"""

import sys
from pathlib import Path

# 添加 backend 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from okx_api import MarketAPI, AccountAPI, TradeAPI, OKXConfig


def main():
    # 从 .env 加载配置
    config = OKXConfig.from_env()

    # 1. 市场数据API
    market = MarketAPI(flag=config.flag)
    price = market.get_spot_price("BTC-USDT")
    print(f"BTC-USDT 价格: {price}")

    # 2. 账户API (需要认证)
    if config.needs_auth:
        account = AccountAPI(config)
        balance = account.get_balance()
        print(f"账户余额: {balance}")

    # 3. 交易API (需要认证)
    if config.needs_auth:
        trade = TradeAPI(config)

        # 市价买入BTC
        result = trade.place_market_order(
            instId="BTC-USDT",
            tdMode="cash",
            side="buy",
            sz="0.001",
        )
        print(f"下单结果: {result}")

        # 限价卖出ETH
        result = trade.place_limit_order(
            instId="ETH-USDT",
            tdMode="cash",
            side="sell",
            px="2000",
            sz="0.1",
        )
        print(f"下单结果: {result}")


if __name__ == "__main__":
    main()
