"""AI 交易核心类"""

from typing import Optional, List
from .config import AIConfig
from .client import LLMClient
from .prompts import TradePromptTemplate
from .types import TradeCommand, TradeAction


class AITrader:
    """AI 交易类"""

    def __init__(
        self,
        config: Optional[AIConfig] = None,
        client: Optional[LLMClient] = None,
    ):
        """
        Args:
            config: AI 配置
            client: LLM 客户端（可选，用于测试注入）
        """
        self.config = config or AIConfig.from_env()
        self.client = client or LLMClient(self.config)
        self.prompt_template = TradePromptTemplate()

    def analyze(
        self,
        market_data: dict,
        indicators: dict,
        strategy_signals: Optional[List[dict]] = None,
        user_prompt: Optional[str] = None,
        account_data: Optional[dict] = None,
    ) -> TradeCommand:
        """
        分析市场并生成交易指令

        Args:
            market_data: 市场数据字典，包含 inst_id, price, volume, high_24h, low_24h
            indicators: 技术指标字典
            strategy_signals: 策略信号列表，每个信号包含 strategy_name, signal, confidence
            user_prompt: 用户额外提示词
            account_data: 账户数据字典，包含 balance, positions, recent_trades

        Returns:
            TradeCommand: 交易指令
        """
        strategy_signals = strategy_signals or []

        # 构建提示词
        system_prompt = self.prompt_template.SYSTEM_PROMPT
        user_prompt = self.prompt_template.build_user_prompt(
            market_data=market_data,
            indicators=indicators,
            strategy_signals=strategy_signals,
            user_prompt=user_prompt,
            account_data=account_data,
        )

        # 调用 LLM
        return self.client.analyze_trade(system_prompt, user_prompt)

    def should_trade(
        self,
        market_data: dict,
        indicators: dict,
        strategy_signals: Optional[List[dict]] = None,
        user_prompt: Optional[str] = None,
        account_data: Optional[dict] = None,
        min_confidence: float = 0.6,
    ) -> bool:
        """
        判断是否应该交易

        Args:
            market_data: 市场数据
            indicators: 技术指标
            strategy_signals: 策略信号
            user_prompt: 用户提示词
            account_data: 账户数据
            min_confidence: 最小置信度阈值

        Returns:
            bool: 是否应该交易
        """
        command = self.analyze(
            market_data=market_data,
            indicators=indicators,
            strategy_signals=strategy_signals,
            user_prompt=user_prompt,
            account_data=account_data,
        )

        if command.action == TradeAction.HOLD:
            return False

        return command.confidence >= min_confidence
