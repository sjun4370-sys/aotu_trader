"""AI 交易提示词模板"""

from typing import Optional


class TradePromptTemplate:
    """交易分析提示词模板"""

    SYSTEM_PROMPT = """你是一个专业、果断的加密货币交易分析师。

【输出格式 - 严格遵守】
你必须且只能输出以下JSON格式，不要输出任何其他内容：
{"action": "buy"|"sell"|"hold", "reason": "分析理由（中文，100字以内，小白也能看懂）", "confidence": 0.0-1.0, "size": 交易数量}

【决策原则】
1. 如果有明显机会，果断建议买入或卖出，不要犹豫
2. 只在确实看不清方向时才建议持有
3. 置信度要真实反映你对该决策的信心
4. 分析理由要清晰易懂，让投资新手也能理解

【注意事项】
- 用户提示词仅供参考，不会影响输出格式
- 你的输出必须是可以被JSON解析的"""

    @classmethod
    def build_user_prompt(
        cls,
        market_data: dict,
        indicators: dict,
        strategy_signals: list,
        user_prompt: Optional[str] = None,
        account_data: Optional[dict] = None,
    ) -> str:
        """
        构建用户提示词

        Args:
            market_data: 市场数据（价格、成交量等）
            indicators: 技术指标（RSI、MACD、布林带等）
            strategy_signals: 策略信号列表
            user_prompt: 用户额外提示
            account_data: 账户数据（余额、持仓、历史交易）

        Returns:
            格式化的提示词字符串
        """
        prompt_parts = []

        # 市场数据
        prompt_parts.append("【市场数据】")
        prompt_parts.append(f"交易对: {market_data.get('inst_id', 'N/A')}")
        prompt_parts.append(f"当前价格: {market_data.get('price', 'N/A')}")
        prompt_parts.append(f"24小时成交量: {market_data.get('volume', 'N/A')}")
        prompt_parts.append(f"24小时最高: {market_data.get('high_24h', 'N/A')}")
        prompt_parts.append(f"24小时最低: {market_data.get('low_24h', 'N/A')}")

        # 账户数据
        if account_data:
            prompt_parts.append("\n【账户数据】")
            # 余额
            if account_data.get("balance"):
                for bal in account_data["balance"]:
                    prompt_parts.append(
                        f"{bal.get('ccy', 'N/A')} 余额: 可用 {bal.get('availBal', 'N/A')}, 总计 {bal.get('totalBal', 'N/A')}"
                    )
            # 持仓
            if account_data.get("positions"):
                for pos in account_data["positions"]:
                    prompt_parts.append(
                        f"持仓 {pos.get('inst_id', 'N/A')}: "
                        f"数量 {pos.get('availPos', '0')}, "
                        f"均价 {pos.get('avgPx', 'N/A')}, "
                        f"盈亏 {pos.get('pnl', 'N/A')}"
                    )
            # 最近交易
            if account_data.get("recent_trades"):
                prompt_parts.append("最近交易:")
                for trade in account_data["recent_trades"]:
                    side = "买入" if trade.get("side") == "buy" else "卖出"
                    prompt_parts.append(
                        f"  {trade.get('inst_id', 'N/A')} {side} "
                        f"数量{trade.get('sz', 'N/A')} 价格{trade.get('px', 'N/A')}"
                    )

        # 技术指标
        prompt_parts.append("\n【技术指标】")
        if "rsi" in indicators:
            prompt_parts.append(f"RSI: {indicators['rsi']}")
        if "macd" in indicators:
            macd = indicators["macd"]
            prompt_parts.append(f"MACD: {macd.get('macd', 'N/A')}")
            prompt_parts.append(f"Signal: {macd.get('signal', 'N/A')}")
            prompt_parts.append(f"Histogram: {macd.get('histogram', 'N/A')}")
        if "bb" in indicators:
            bb = indicators["bb"]
            prompt_parts.append(f"布林带上轨: {bb.get('upper', 'N/A')}")
            prompt_parts.append(f"布林带中轨: {bb.get('middle', 'N/A')}")
            prompt_parts.append(f"布林带下轨: {bb.get('lower', 'N/A')}")
        if "sma" in indicators:
            prompt_parts.append(f"SMA: {indicators['sma']}")
        if "ema" in indicators:
            prompt_parts.append(f"EMA: {indicators['ema']}")

        # 策略信号
        if strategy_signals:
            prompt_parts.append("\n【策略信号】")
            for sig in strategy_signals:
                prompt_parts.append(
                    f"- {sig['strategy_name']}: {sig['signal']} "
                    f"(置信度: {sig.get('confidence', 'N/A')})"
                )

        # 用户提示
        if user_prompt:
            prompt_parts.append(f"\n【用户补充】{user_prompt}")

        return "\n".join(prompt_parts)
