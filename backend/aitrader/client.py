"""LLM 客户端封装"""

import json
from typing import Optional, Literal
from .config import AIConfig
from .types import TradeCommand, TradeAction


class LLMClient:
    """大模型客户端"""

    def __init__(self, config: Optional[AIConfig] = None):
        self.config = config or AIConfig.from_env()

    def analyze_trade(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> TradeCommand:
        """
        调用 LLM 分析交易

        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词

        Returns:
            TradeCommand: 交易指令
        """
        if self.config.provider == "anthropic":
            return self._call_anthropic(system_prompt, user_prompt)
        elif self.config.provider == "openai":
            return self._call_openai(system_prompt, user_prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.config.provider}")

    def _call_anthropic(self, system_prompt: str, user_prompt: str) -> TradeCommand:
        """调用 Anthropic Claude API"""
        try:
            from anthropic import Anthropic
        except ImportError:
            raise ImportError("请安装 anthropic 包: pip install anthropic")

        kwargs = {"api_key": self.config.anthropic_api_key}
        if self.config.anthropic_base_url:
            kwargs["base_url"] = self.config.anthropic_base_url
        client = Anthropic(**kwargs)

        response = client.messages.create(
            model=self.config.anthropic_model,
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        # 提取文本内容，跳过 ThinkingBlock 等非文本块
        text_content = None
        for block in response.content:
            if hasattr(block, "text") and block.text:
                text_content = block.text
                break

        if not text_content:
            return TradeCommand(
                action=TradeAction.HOLD,
                reason="未获取到有效响应",
                confidence=0.0,
            )

        return self._parse_response(text_content)

    def _call_openai(self, system_prompt: str, user_prompt: str) -> TradeCommand:
        """调用 OpenAI API"""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("请安装 openai 包: pip install openai")

        kwargs = {"api_key": self.config.openai_api_key}
        if self.config.openai_base_url:
            kwargs["base_url"] = self.config.openai_base_url
        client = OpenAI(**kwargs)

        response = client.chat.completions.create(
            model=self.config.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=self.config.max_tokens,
            temperature=self.config.temperature,
        )

        return self._parse_response(response.choices[0].message.content)

    def _parse_response(self, content: str) -> TradeCommand:
        """解析 LLM 响应"""
        try:
            # 尝试提取 JSON
            content = content.strip()
            if content.startswith("```"):
                # 移除代码块标记
                lines = content.split("\n")
                content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

            data = json.loads(content)

            action_str = data.get("action", "hold").lower()
            if action_str not in ["buy", "sell", "hold"]:
                action_str = "hold"

            return TradeCommand(
                action=TradeAction(action_str),
                reason=data.get("reason", "无分析理由"),
                confidence=max(0.0, min(1.0, float(data.get("confidence", 0.5)))),
                size=data.get("size"),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # 解析失败，返回默认 HOLD
            return TradeCommand(
                action=TradeAction.HOLD,
                reason=f"解析失败: {str(e)}",
                confidence=0.0,
            )
