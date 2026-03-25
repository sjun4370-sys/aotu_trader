"""
交易相关 Pydantic 模型
"""
from typing import Optional, List
from pydantic import BaseModel


class TradingRequest(BaseModel):
    """交易请求"""
    inst_id: str
    user_prompt: Optional[str] = None


class TradingResponse(BaseModel):
    """交易响应"""
    inst_id: str
    action: str
    reason: str
    confidence: float
    success: bool


class BatchTradingRequest(BaseModel):
    """批量交易请求"""
    inst_ids: List[str]
    parallel: bool = False
    max_workers: int = 3
    user_prompt: Optional[str] = None


class BatchTradingResponse(BaseModel):
    """批量交易响应"""
    results: List[TradingResponse]
