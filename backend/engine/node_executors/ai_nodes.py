"""
AI分析节点执行器 - 真实调用LLM API
"""

from __future__ import annotations

import logging
import json
import time
from typing import Any, Dict
from decimal import Decimal

import anthropic
from openai import OpenAI

from engine.context import ExecutionContext
from engine.node_output import NodeOutput

logger = logging.getLogger(__name__)

# 初始化客户端
claude_client = None
openai_client = None


def init_llm_clients():
    """初始化LLM客户端"""
    global claude_client, openai_client

    from config.system_config import system_config

    anthropic_key = system_config.anthropic_api_key
    openai_key = system_config.openai_api_key

    if anthropic_key:
        claude_client = anthropic.Anthropic(api_key=anthropic_key)
        logger.info("Claude客户端已初始化")

    if openai_key:
        openai_client = OpenAI(api_key=openai_key)
        logger.info("OpenAI客户端已初始化")


async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
    """AI节点执行器入口"""
    timestamp = time.time()

    if node_type == "llm_analysis":
        return await _execute_llm_analysis(node_id, config, inputs, context, timestamp)
    elif node_type == "signal_generator":
        return await _execute_signal_generator(node_id, config, inputs, context, timestamp)
    else:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type=node_type,
            data={},
            timestamp=timestamp,
            error=f"Unknown node type: {node_type}"
        )


async def _execute_llm_analysis(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    LLM市场分析节点 - 真实调用Claude API
    综合分析市场数据、技术指标，给出交易建议
    """
    provider = config.get("provider", "claude")  # claude 或 openai
    model = config.get("model", "claude-3-sonnet-20240229")

    # 从inputs迭代收集上游节点数据
    ticker = {}
    candles = []
    rsi = None
    macd = {}
    bollinger = {}
    ma = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "okx_ticker":
            ticker = data
        elif node_type == "okx_candles":
            candles = data.get("candles", [])
        elif node_type == "rsi":
            rsi = data.get("rsi")
        elif node_type == "macd":
            macd = data
        elif node_type == "bollinger":
            bollinger = data
        elif node_type == "ma":
            ma = data

    # 兼容context.variables旧写法
    if not ticker:
        ticker = context.variables.get("ticker", {})
    if not candles:
        candles = context.variables.get("candles", [])
    if rsi is None:
        rsi = context.variables.get("rsi")
    if not macd:
        macd = context.variables.get("macd", {})

    # 构建市场数据摘要
    market_summary = _build_market_summary(ticker, candles, rsi, macd)

    logger.info(f"[LLM] 开始市场分析 (Provider: {provider})")

    # 构建提示词
    prompt = _build_analysis_prompt(market_summary)

    # 检查API配置
    has_api_key = (provider == "claude" and claude_client) or (provider == "openai" and openai_client)

    if not has_api_key:
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="llm_analysis",
            data={},
            timestamp=timestamp,
            error="LLM API not configured"
        )

    try:
        if provider == "claude" and claude_client:
            response = claude_client.messages.create(
                model=model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                timeout=30.0,
            )
            analysis_text = response.content[0].text

        elif provider == "openai" and openai_client:
            response = openai_client.chat.completions.create(
                model=model or "gpt-4",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000,
                timeout=30.0,
            )
            analysis_text = response.choices[0].message.content

        # 解析分析结果
        parsed_result = _parse_llm_response(analysis_text)

        output = {
            "provider": provider,
            "model": model,
            "raw_analysis": analysis_text,
            "sentiment": parsed_result.get("sentiment", "neutral"),
            "trend": parsed_result.get("trend", "sideways"),
            "recommendation": parsed_result.get("recommendation", "HOLD"),
            "confidence": parsed_result.get("confidence", 50),
            "reasoning": parsed_result.get("reasoning", ""),
            "risk_level": parsed_result.get("risk_level", "medium"),
            "key_levels": parsed_result.get("key_levels", {}),
            "timeframe": parsed_result.get("timeframe", "short_term"),
        }

        # 保存到上下文
        context.variables["llm_analysis"] = output
        context.variables["ai_recommendation"] = output["recommendation"]
        context.variables["ai_confidence"] = output["confidence"]

        logger.info(
            f"[LLM] 分析完成: {output['recommendation']} (置信度: {output['confidence']}%)"
        )
        return NodeOutput(
            success=True,
            node_id=node_id,
            node_type="llm_analysis",
            data=output,
            timestamp=timestamp
        )

    except Exception as e:
        logger.error(f"[LLM] 分析失败: {e}")
        return NodeOutput(
            success=False,
            node_id=node_id,
            node_type="llm_analysis",
            data={},
            timestamp=timestamp,
            error=str(e)
        )


def _build_market_summary(ticker: Dict, candles: list, rsi: Any, macd: Dict) -> Dict:
    """构建市场数据摘要"""
    summary = {
        "inst_id": ticker.get("inst_id", "BTC-USDT"),
        "current_price": float(ticker.get("last", 0)) if ticker else 0,
        "change_24h": float(ticker.get("change_24h", 0)) if ticker else 0,
        "high_24h": float(ticker.get("high_24h", 0)) if ticker else 0,
        "low_24h": float(ticker.get("low_24h", 0)) if ticker else 0,
        "volume_24h": float(ticker.get("vol_24h", 0)) if ticker else 0,
        "bid_ask_spread": (
            (float(ticker.get("ask", 0)) - float(ticker.get("bid", 0)))
            / float(ticker.get("last", 1))
            * 100
            if ticker and ticker.get("last")
            else 0
        ),
    }

    # 添加技术指标
    if rsi is not None:
        summary["rsi"] = float(rsi) if isinstance(rsi, (int, float, Decimal)) else None

    if macd:
        summary["macd"] = {
            "macd": macd.get("macd"),
            "signal": macd.get("signal"),
            "histogram": macd.get("histogram"),
            "crossover": macd.get("crossover"),
        }

    # 计算短期趋势
    if candles and len(candles) >= 10:
        recent = candles[-10:]
        closes = [float(c.get("close", 0)) for c in recent]
        summary["short_term_trend"] = "up" if closes[-1] > closes[0] else "down"
        summary["volatility"] = (
            (max(closes) - min(closes)) / sum(closes) * len(closes) * 100
            if closes
            else 0
        )

    return summary


def _build_analysis_prompt(market_summary: Dict) -> str:
    """构建分析提示词"""
    return f"""你是一位资深的加密货币量化交易专家。请基于以下市场数据，提供详细的交易分析和建议。

## 市场数据

**基础行情**
- 交易对: {market_summary.get("inst_id", "BTC-USDT")}
- 当前价格: {market_summary.get("current_price", "N/A")} USDT
- 24h涨跌: {market_summary.get("change_24h", "N/A")}%
- 24h最高: {market_summary.get("high_24h", "N/A")} USDT
- 24h最低: {market_summary.get("low_24h", "N/A")} USDT
- 24h成交量: {market_summary.get("volume_24h", "N/A")} USDT
- 买卖价差: {market_summary.get("bid_ask_spread", "N/A")}%

**技术指标**
- RSI: {market_summary.get("rsi", "N/A")}
- MACD: {market_summary.get("macd", {}).get("macd", "N/A")}
- MACD信号: {market_summary.get("macd", {}).get("signal", "N/A")}
- MACD交叉: {market_summary.get("macd", {}).get("crossover", "N/A")}
- 短期趋势: {market_summary.get("short_term_trend", "N/A")}
- 波动率: {market_summary.get("volatility", 0):.2f}%

## 请提供以下分析

1. **趋势判断**: 当前是上涨/下跌/震荡趋势？判断依据是什么？

2. **技术指标解读**:
   - RSI指标的含义（超买/超卖/中性）
   - MACD指标的含义（金叉/死叉/趋势强度）
   - 其他技术指标的综合判断

3. **关键价位**:
   - 支撑位（至少2个）
   - 阻力位（至少2个）
   - 目标价（短期、中期）

4. **交易建议**:
   - 操作方向：BUY / SELL / HOLD
   - 建议仓位：轻仓/半仓/满仓（百分比）
   - 入场价位区间
   - 止损价位
   - 止盈价位

5. **风险评估**:
   - 风险等级：low / medium / high
   - 主要风险因素
   - 建议的风控措施

6. **时间框架**:
   - 短期预期（1-3天）
   - 中期预期（1-2周）

7. **置信度评估**:
   - 给出一个0-100的置信度分数
   - 说明评分依据

请以结构化的JSON格式返回结果，格式如下：
{{
    "sentiment": "bullish/bearish/neutral",
    "trend": "uptrend/downtrend/sideways",
    "recommendation": "BUY/SELL/HOLD",
    "confidence": 75,
    "reasoning": "详细的分析理由...",
    "risk_level": "low/medium/high",
    "key_levels": {{
        "support": [58000, 56000],
        "resistance": [62000, 65000],
        "target": 65000,
        "stop_loss": 55000
    }},
    "position_sizing": "建议仓位百分比",
    "timeframe": "short_term/medium_term",
    "detailed_analysis": "详细的市场分析..."
}}
"""


def _parse_llm_response(text: str) -> Dict:
    """解析LLM返回的结构化数据"""
    try:
        # 尝试提取JSON
        if "```json" in text:
            json_str = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            json_str = text.split("```")[1].split("```")[0].strip()
        else:
            # 尝试找到JSON部分
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                json_str = text[start : end + 1]
            else:
                json_str = text

        result = json.loads(json_str)
        return result
    except Exception as e:
        logger.warning(f"解析LLM响应失败: {e}")
        # 返回默认结构
        return {
            "sentiment": "neutral",
            "trend": "sideways",
            "recommendation": "HOLD",
            "confidence": 50,
            "reasoning": text[:500] if text else "无法解析",
            "risk_level": "medium",
            "key_levels": {},
            "timeframe": "short_term",
        }

async def _execute_signal_generator(
    node_id: str,
    config: Dict,
    inputs: Dict[str, NodeOutput],
    context: ExecutionContext,
    timestamp: float
) -> NodeOutput:
    """
    信号生成节点 - 综合AI分析和规则生成最终交易信号
    """
    strategy_type = config.get(
        "strategy_type", "ai_assisted"
    )  # ai_assisted, rule_based, hybrid

    # 从inputs迭代收集上游节点数据
    ai_analysis = {}
    rsi = None
    macd = {}
    ticker = {}

    for src_id, src_output in inputs.items():
        if not src_output or not src_output.data:
            continue
        node_type = src_output.node_type
        data = src_output.data
        if node_type == "llm_analysis":
            ai_analysis = data
        elif node_type == "rsi":
            rsi = data.get("rsi")
        elif node_type == "macd":
            macd = data
        elif node_type == "okx_ticker":
            ticker = data

    # 兼容context.variables旧写法
    if not ai_analysis:
        ai_analysis = context.variables.get("llm_analysis", {})
    if rsi is None:
        rsi = context.variables.get("rsi")
    if not macd:
        macd = context.variables.get("macd", {})
    if not ticker:
        ticker = context.variables.get("ticker", {})

    ai_recommendation = ai_analysis.get("recommendation", "HOLD")
    ai_confidence = ai_analysis.get("confidence", 50)
    current_price = ticker.get("last", 0)

    # 综合判断
    signal = _generate_trading_signal(
        ai_recommendation, ai_confidence, rsi, macd, strategy_type
    )

    output = {
        "signal": signal["action"],  # BUY / SELL / HOLD
        "side": signal["side"],  # long / short
        "qty": signal.get("qty"),
        "price": signal.get("price"),
        "confidence": signal["confidence"],
        "reason": signal["reason"],
        "risk_level": ai_analysis.get("risk_level", "medium"),
        "stop_loss": ai_analysis.get("key_levels", {}).get("stop_loss"),
        "take_profit": ai_analysis.get("key_levels", {}).get("target"),
        "timestamp": int(time.time() * 1000),
    }

    context.variables["trading_signal"] = output
    logger.info(
        f"[Signal] 生成信号: {output['signal']} (置信度: {output['confidence']}%)"
    )

    return NodeOutput(
        success=True,
        node_id=node_id,
        node_type="signal_generator",
        data=output,
        timestamp=timestamp
    )


def _generate_trading_signal(
    ai_rec: str, ai_conf: int, rsi: Any, macd: Dict, strategy: str
) -> Dict:
    """生成交易信号"""

    # AI信号权重
    ai_weight = 0.6 if strategy == "ai_assisted" else 0.3
    tech_weight = 1 - ai_weight

    # 技术指标信号
    tech_signal = 0  # -1 to 1

    if rsi is not None:
        if rsi < 30:
            tech_signal += 0.3  # 超卖，看涨
        elif rsi > 70:
            tech_signal -= 0.3  # 超买，看跌

    if macd.get("crossover") == "golden":
        tech_signal += 0.4
    elif macd.get("crossover") == "death":
        tech_signal -= 0.4

    # AI信号
    ai_signal = 0
    if ai_rec == "BUY":
        ai_signal = 1
    elif ai_rec == "SELL":
        ai_signal = -1

    # 综合得分
    combined_score = ai_signal * ai_weight * (ai_conf / 100) + tech_signal * tech_weight

    # 生成信号
    if combined_score > 0.5:
        return {
            "action": "BUY",
            "side": "long",
            "confidence": min(100, int(abs(combined_score) * 100)),
            "reason": f"AI建议{ai_rec}(置信度{ai_conf}%) + 技术指标支持",
        }
    elif combined_score < -0.5:
        return {
            "action": "SELL",
            "side": "short",
            "confidence": min(100, int(abs(combined_score) * 100)),
            "reason": f"AI建议{ai_rec}(置信度{ai_conf}%) + 技术指标支持",
        }
    else:
        return {
            "action": "HOLD",
            "side": "net",
            "confidence": int(abs(combined_score) * 100),
            "reason": "信号不明确，建议观望",
        }
