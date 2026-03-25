"""
交易服务 - 封装交易业务逻辑
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional

from aitrader import AIConfig, AITrader
from analysis import TechnicalAnalysis
from okx_api import AccountAPI, MarketAPI, OKXConfig, TradeAPI
from strategy import BollingerStrategy, MACDStrategy, RSIStrategy, StrategyRunner


class TradingService:
    """交易服务"""

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

    def execute(self, user_prompt: Optional[str] = None) -> dict:
        """
        执行完整交易流程

        Returns:
            dict: 包含 inst_id, action, reason, confidence, success
        """
        try:
            # Step 1: 获取市场数据
            market_data = self._get_market_data()

            # Step 2: 计算技术指标
            indicators = self._calculate_indicators()

            # Step 3: 运行策略
            strategy_signals = self._run_strategies(indicators)

            # Step 4: 获取账户数据
            account_data = self._get_account_data()

            # Step 5: AI 交易分析
            trade_command = self._ai_analysis(
                market_data, indicators, strategy_signals, user_prompt, account_data
            )

            # Step 6: 执行交易
            if self.okx_config.needs_auth and trade_command.action.value != "hold":
                self._execute_trade(trade_command)

            return {
                "inst_id": self.inst_id,
                "action": trade_command.action.value,
                "reason": trade_command.reason,
                "confidence": trade_command.confidence,
                "success": True,
            }

        except Exception as e:
            return {
                "inst_id": self.inst_id,
                "action": "error",
                "reason": str(e),
                "confidence": 0.0,
                "success": False,
            }

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
        """获取账户数据"""
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
            return

        action = trade_command.action.value
        side = "buy" if action == "buy" else "sell"
        size = trade_command.size if trade_command.size else "0.001"

        self.trade_api.place_market_order(
            instId=self.inst_id,
            tdMode="cash",
            side=side,
            sz=size,
        )


def run_single_trading(inst_id: str, user_prompt: str = None) -> dict:
    """运行单个币种交易"""
    service = TradingService(inst_id=inst_id)
    return service.execute(user_prompt=user_prompt)


def run_parallel(inst_ids: list, max_workers: int = 3, user_prompt: str = None) -> List[dict]:
    """并行执行多个币种"""
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(run_single_trading, inst_id, user_prompt): inst_id
            for inst_id in inst_ids
        }
        for future in as_completed(futures):
            results.append(future.result())
    return results


def run_serial(inst_ids: list, user_prompt: str = None) -> List[dict]:
    """串行执行多个币种"""
    return [run_single_trading(inst_id, user_prompt) for inst_id in inst_ids]
