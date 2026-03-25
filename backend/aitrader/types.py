"""AI 交易模块类型定义"""

from dataclasses import dataclass
from typing import Optional, Literal
from enum import Enum


class TradeAction(Enum):
    """交易动作"""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


@dataclass
class TradeCommand:
    """AI 交易指令"""
    action: TradeAction
    reason: str  # 分析理由
    confidence: float  # 置信度 0-1
    size: Optional[float] = None  # 交易数量


@dataclass
class MarketData:
    """市场数据"""
    inst_id: str
    price: float
    volume: float
    high_24h: float
    low_24h: float


@dataclass
class StrategySignal:
    """策略信号"""
    strategy_name: str
    signal: str  # "buy", "sell", "hold"
    confidence: float