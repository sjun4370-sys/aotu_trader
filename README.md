# Aotu Trader

加密货币 AI 交易系统，支持 OKX 交易所、多种交易策略和技术指标分析。

## 技术栈

- **前端**: React + Tauri (桌面 + 网页)
- **后端**: FastAPI + SQLAlchemy + SQLite
- **AI**: Claude / GPT 支持

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run tauri dev
```

## 项目结构

```
├── backend/              # FastAPI 后端
│   ├── api/            # API 接口
│   ├── services/       # 业务逻辑
│   ├── database/       # 数据库
│   ├── okx_api/       # OKX API
│   ├── analysis/       # 技术分析
│   ├── strategy/       # 交易策略
│   └── aitrader/       # AI 交易
├── frontend/           # React + Tauri
├── examples/           # 示例脚本
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|:---:|---|---|
| POST | `/api/trading/trade` | 单币种交易 |
| POST | `/api/trading/trade/batch` | 批量交易 |
| GET | `/health` | 健康检查 |

### 示例

```bash
curl -X POST http://localhost:8000/api/trading/trade \
  -H "Content-Type: application/json" \
  -d '{"inst_id": "BTC-USDT"}'
```

## 配置

复制 `backend/.env.example` 为 `backend/.env` 并填写配置：

```bash
api_key=your_api_key
secret_key=your_secret_key
passphrase=your_passphrase
flag=1  # 0=实盘, 1=模拟盘

# AI 交易配置
llm_provider=openai
llm_max_tokens=1024
llm_temperature=0.7

anthropic_api_key=xxxx
anthropic_base_url=
anthropic_model=xxxx

openai_api_key=xxxx
openai_base_url=
openai_model=xxxx
```

## 示例脚本

```bash
python examples/run_trading.py BTC-USDT              # 单币种
python examples/run_trading.py BTC-USDT ETH-USDT    # 多币种
python examples/run_trading.py --parallel BTC-USDT ETH-USDT SOL-USDT  # 并行
python examples/run_trading.py --loop BTC-USDT       # 循环执行
```

## 交易策略

| 策略 | 说明 |
|---|---|
| RSI | 超买超卖 |
| MACD | 金叉死叉 |
| Bollinger | 布林带 |

## 注意事项

- 模拟盘（`flag=1`）测试通过后再切换实盘（`flag=0`）
- 交易有风险，请谨慎操作
