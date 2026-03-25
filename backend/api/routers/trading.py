"""
交易 API 路由
"""
from typing import Optional, List
from fastapi import APIRouter

from api.schemas import (
    TradingRequest,
    TradingResponse,
    BatchTradingRequest,
    BatchTradingResponse,
)
from services import TradingService, run_parallel, run_serial

router = APIRouter()


@router.post("/trade", response_model=TradingResponse)
def trade(request: TradingRequest):
    """
    执行单个币种交易

    - **inst_id**: 币种，如 BTC-USDT
    - **user_prompt**: 可选的 AI 分析提示词
    """
    service = TradingService(inst_id=request.inst_id)
    result = service.execute(user_prompt=request.user_prompt)
    return TradingResponse(**result)


@router.post("/trade/batch", response_model=BatchTradingResponse)
def trade_batch(request: BatchTradingRequest):
    """
    批量执行交易

    - **inst_ids**: 币种列表
    - **parallel**: 是否并行执行
    - **max_workers**: 并行模式最大线程数
    - **user_prompt**: 可选的 AI 分析提示词
    """
    if request.parallel:
        results = run_parallel(
            request.inst_ids,
            request.max_workers,
            request.user_prompt
        )
    else:
        results = run_serial(request.inst_ids, request.user_prompt)

    return BatchTradingResponse(
        results=[TradingResponse(**r) for r in results]
    )
