"""
FastAPI 主应用
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import trading, workflow
from config.system_config import system_config
from engine.workflow_engine import workflow_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 - 启动时初始化API"""
    # 启动时初始化OKX API
    if system_config.is_configured():
        okx_config = system_config.to_okx_config()
        workflow_engine.initialize_apis(
            okx_config=okx_config,
            llm_config={"api_key": system_config.anthropic_api_key} if system_config.has_llm_config() else None,
            proxy=system_config.https_proxy if system_config.https_proxy else None,
        )
        print("[OKX API] 启动时初始化成功")
    else:
        print("[OKX API] 未配置，跳过初始化")
    yield
    # 关闭时的清理逻辑可以放这里


app = FastAPI(
    title="OKX Trader API",
    description="加密货币 AI 交易系统 API",
    version="0.1.0",
    lifespan=lifespan,
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
app.include_router(workflow.router, prefix="/api/workflow", tags=["workflow"])


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "ok"}
