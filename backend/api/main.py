"""
FastAPI 主应用
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import trading

app = FastAPI(
    title="OKX Trader API",
    description="加密货币 AI 交易系统 API",
    version="0.1.0",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(trading.router, prefix="/api/trading", tags=["交易"])


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "ok"}
