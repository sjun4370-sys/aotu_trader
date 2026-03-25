"""
OKX AI 交易执行流程演示
整合：市场数据获取 -> 技术指标计算 -> 策略分析 -> AI 决策 -> 交易执行
"""

import sys
from pathlib import Path

# 添加 backend 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / "backend"))

import json

from aitrader import AIConfig, AITrader
from analysis import TechnicalAnalysis
from okx_api import AccountAPI, MarketAPI, OKXConfig, TradeAPI
from strategy import BollingerStrategy, MACDStrategy, RSIStrategy, StrategyRunner


class TradingFlowDemo:
    """交易执行流程演示"""

    def __init__(self, inst_id: str = "BTC-USDT"):
        self.inst_id = inst_id
        self.okx_config = OKXConfig.from_env()
        self.ai_config = AIConfig.from_env()

        # 初始化各模块
        self.market_api = MarketAPI(flag=self.okx_config.flag)
        self.account_api = (
            AccountAPI(self.okx_config) if self.okx_config.needs_auth else None
        )
        self.trade_api = (
            TradeAPI(self.okx_config) if self.okx_config.needs_auth else None
        )
        self.analysis = TechnicalAnalysis(flag=self.okx_config.flag)
        self.ai_trader = AITrader(config=self.ai_config)

        # 策略列表
        self.strategies = [
            RSIStrategy(inst_id=inst_id, period="1H"),
            MACDStrategy(inst_id=inst_id, period="1H"),
            BollingerStrategy(inst_id=inst_id, period="1H"),
        ]

    def run(self, user_prompt: str = None):
        """
        执行完整交易流程

        Args:
            user_prompt: 用户额外提示词
        """
        print(f"\n{'=' * 60}")
        print(f"开始交易流程 - {self.inst_id}")
        print(f"{'=' * 60}\n")

        # Step 1: 获取市场数据
        market_data = self._get_market_data()
        print("[Step 1] 市场数据")
        print(f"  交易对: {market_data.get('inst_id', 'N/A')}")
        print(f"  当前价格: {market_data.get('price', 'N/A')}")
        print(f"  24h成交量: {market_data.get('volume', 'N/A')}")
        print(f"  24h最高: {market_data.get('high_24h', 'N/A')}")
        print(f"  24h最低: {market_data.get('low_24h', 'N/A')}\n")

        # Step 2: 计算技术指标
        indicators = self._calculate_indicators()
        print("[Step 2] 技术指标")
        print(f"  RSI: {indicators.get('rsi', 'N/A')}")
        macd = indicators.get("macd", {})
        print(f"  MACD: {macd.get('macd', 'N/A')}, Signal: {macd.get('signal', 'N/A')}")
        bb = indicators.get("bb", {})
        print(
            f"  布林带: 上轨={bb.get('upper', 'N/A')}, 中轨={bb.get('middle', 'N/A')}, 下轨={bb.get('lower', 'N/A')}\n"
        )

        # Step 3: 运行策略
        strategy_signals = self._run_strategies(indicators)
        print("[Step 3] 策略信号")
        for sig in strategy_signals:
            print(
                f"  {sig['strategy_name']}: {sig['signal'].upper()} (置信度: {sig['confidence']})"
            )

        # Step 3.5: 获取账户数据
        account_data = self._get_account_data()
        if account_data:
            print("[Step 3.5] 账户数据")
            if account_data.get("balance"):
                print(f"  账户余额: {account_data['balance']}")
            if account_data.get("positions"):
                print(f"  持仓: {account_data['positions']}")
            if account_data.get("recent_trades"):
                print(f"  最近交易: {account_data['recent_trades']}")

        # Step 4: AI 交易分析
        trade_command = self._ai_analysis(
            market_data, indicators, strategy_signals, user_prompt, account_data
        )
        action_cn = {"buy": "买入", "sell": "卖出", "hold": "持有"}.get(
            trade_command.action.value, trade_command.action.value
        )
        print(f"[Step 4] AI 交易指令")
        print(f"  操作: {action_cn}")
        print(f"  原因: {trade_command.reason}")
        print(f"  置信度: {trade_command.confidence}\n")

        # Step 5: 执行交易
        if self.okx_config.needs_auth and trade_command.action.value != "hold":
            self._execute_trade(trade_command)

        return trade_command

    def _get_market_data(self) -> dict:
        """获取市场数据"""
        summary = self.market_api.get_market_summary(self.inst_id)
        if not summary:
            return {}

        return {
            "inst_id": self.inst_id,
            "price": summary.get("last"),
            "volume": summary.get("vol_24h"),
            "high_24h": summary.get("high_24h"),
            "low_24h": summary.get("low_24h"),
            "bid": summary.get("bid"),
            "ask": summary.get("ask"),
        }

    def _calculate_indicators(self) -> dict:
        """计算技术指标"""
        return self.analysis.get_indicator_summary(self.inst_id, period="1H", limit=100)

    def _run_strategies(self, indicators: dict) -> list:
        """运行多个策略"""
        signals = []
        for strategy in self.strategies:
            runner = StrategyRunner(strategy)
            signal = runner.get_signal(indicators)

            # 计算简单置信度
            confidence = 0.5
            if signal.value == "buy" or signal.value == "sell":
                confidence = 0.7

            signals.append(
                {
                    "strategy_name": strategy.__class__.__name__,
                    "signal": signal.value,
                    "confidence": confidence,
                }
            )
        return signals

    def _get_account_data(self) -> dict:
        """获取账户数据（余额、持仓、最近交易）"""
        if not self.account_api:
            return {}

        data = {}

        # 获取账户余额
        try:
            balance_result = self.account_api.get_balance()
            success, balance_data = AccountAPI.parse_response(balance_result)
            if success and balance_data:
                balances = []
                for item in balance_data:
                    details = item.get("details", [])
                    for d in details:
                        ccy = d.get("ccy", "")
                        if ccy in ["USDT", "BTC", "ETH"]:
                            balances.append({
                                "ccy": ccy,
                                "availBal": d.get("availBal", "0"),
                                "totalBal": d.get("bal", "0"),
                            })
                if balances:
                    data["balance"] = balances
        except Exception:
            pass

        # 获取持仓
        try:
            positions_result = self.account_api.get_positions(inst_type="SPOT")
            success, positions_data = AccountAPI.parse_response(positions_result)
            if success and positions_data:
                positions = []
                for pos in positions_data:
                    positions.append({
                        "inst_id": pos.get("instId", ""),
                        "availPos": pos.get("availPos", "0"),
                        "avgPx": pos.get("avgPx", "0"),
                        "pnl": pos.get("pnl", "0"),
                    })
                if positions:
                    data["positions"] = positions
        except Exception:
            pass

        return data

    def _ai_analysis(
        self,
        market_data: dict,
        indicators: dict,
        strategy_signals: list,
        user_prompt: str = None,
        account_data: dict = None,
    ):
        """AI 交易分析"""
        return self.ai_trader.analyze(
            market_data=market_data,
            indicators=indicators,
            strategy_signals=strategy_signals,
            user_prompt=user_prompt,
            account_data=account_data,
        )

    def _execute_trade(self, trade_command):
        """执行交易"""
        if not self.trade_api:
            print("[Step 5] 未配置交易权限，跳过交易执行")
            return

        action = trade_command.action.value
        side = "buy" if action == "buy" else "sell"

        size = trade_command.size if trade_command.size else "0.001"

        action_cn = "买入" if side == "buy" else "卖出"
        print(f"[Step 5] 执行交易: {action_cn} {size} {self.inst_id}")

        try:
            result = self.trade_api.place_market_order(
                instId=self.inst_id,
                tdMode="cash",
                side=side,
                sz=size,
            )
            success, data = TradeAPI.parse_response(result)
            if success:
                print(f"  订单成功: {data}")
            else:
                print(f"  订单失败: {data}")
        except Exception as e:
            print(f"  交易异常: {e}")


def main():
    """主函数"""
    import sys

    inst_id = sys.argv[1] if len(sys.argv) > 1 else "BTC-USDT"

    demo = TradingFlowDemo(inst_id=inst_id)

    user_prompt = "关注波动率风险" if len(sys.argv) > 2 else None

    result = demo.run(user_prompt=user_prompt)
    action_cn = {"buy": "买入", "sell": "卖出", "hold": "持有"}.get(
        result.action.value, result.action.value
    )
    print(f"\n{'=' * 60}")
    print(f"最终交易指令: {action_cn}")
    print(f"原因: {result.reason}")
    print(f"置信度: {result.confidence}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
