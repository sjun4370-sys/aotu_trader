# Aotu Trader

加密货币 AI 量化交易系统，支持 OKX 交易所、可视化工作流编排、真实技术指标和 AI 市场分析。

## 功能特性

- **可视化工作流编辑器** — 拖拽式策略编排，实时执行监控
- **真实 OKX API** — 行情、K线、账户、持仓、订单全部真实对接
- **技术指标** — RSI、MACD、布林带、均线（pandas/numpy 计算）
- **AI 市场分析** — Claude / GPT 驱动的交易信号生成
- **完整风控** — 仓位控制、止损止盈、最大亏损限制
- **JSON 导入/导出** — 工作流可分享和备份

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tauri（桌面应用）
- **后端**: FastAPI + SQLAlchemy + SQLite
- **AI**: Claude ( Anthropic ) / GPT ( OpenAI )
- **指标计算**: pandas / numpy（无 TA-Lib 依赖）

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   Tauri 桌面应用                      │
│              React 19 + TypeScript                  │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP (fetch)
┌──────────────────▼──────────────────────────────────┐
│              FastAPI 后端 :8000                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Workflow │  │  Node    │  │   Workflow       │   │
│  │  CRUD    │  │ Executors│  │   Engine        │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└────────┬────────────────┬───────────────────────────┘
         │                │
    ┌────▼────┐      ┌────▼────┐      ┌──────────────┐
    │  SQLite │      │   OKX   │      │  LLM API     │
    │  本地   │      │  交易所  │      │ Claude/GPT   │
    └─────────┘      └─────────┘      └──────────────┘
```

## 快速开始

### 前置要求

- Python 3.9+
- Node.js 18+
- OKX 账户（建议先用模拟盘）

### 1. 配置环境变量

```bash
# backend/.env
OKX_API_KEY=your_okx_api_key
OKX_SECRET_KEY=your_okx_secret_key
OKX_PASSPHRASE=your_okx_passphrase
OKX_FLAG=1           # 1=模拟盘，0=实盘

# AI 配置（可选，不配置则使用模拟数据）
ANTHROPIC_API_KEY=your_anthropic_key
LLM_PROVIDER=claude  # claude 或 openai
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run tauri dev
```

打开 http://localhost:5173/ 即可使用。

### 4. 初始化系统（可选）

```bash
cd backend
python scripts/init_system.py
```

## 项目结构

```
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── routers/             # 路由（workflow.py, trading.py）
│   │   └── schemas/            # Pydantic 模型
│   ├── engine/
│   │   ├── workflow_engine.py   # 工作流执行引擎
│   │   ├── context.py           # 执行上下文
│   │   ├── node_output.py       # 统一输出格式
│   │   └── node_executors/      # 节点执行器
│   │       ├── okx_data_nodes.py  # OKX 行情/账户/持仓
│   │       ├── indicator_nodes.py  # RSI/MACD/布林带/均线
│   │       ├── ai_nodes.py        # AI 分析/信号生成
│   │       ├── risk_nodes.py      # 风控/止损/止盈
│   │       ├── trade_nodes.py     # 订单创建/监控/取消
│   │       ├── currency_executor.py # 币种选择
│   │       └── condition_executor.py # 条件分支
│   ├── services/               # 业务逻辑层
│   ├── database/               # SQLAlchemy 模型
│   ├── okx_api/               # OKX API 封装
│   └── config/                 # 系统配置
├── frontend/src/
│   ├── components/
│   │   ├── workflow/           # 工作流画布组件
│   │   ├── node-content/       # 节点内容编辑
│   │   └── node-data-viewer/   # 节点数据展示
│   └── services/               # API 客户端
└── docs/superpowers/           # 实现计划和设计规格
```

## 节点说明

### 数据节点

| 节点 | 功能 | 输出 |
|------|------|------|
| 币种选择 | 选择交易标的 | `inst_id`, `name`, `category` |
| OKX 行情 | 实时 ticker | 价格、24h 涨跌、买卖盘 |
| OKX K线 | 历史 K 线 | OHLCV 数据、收盘价序列 |
| OKX 订单簿 | 买卖深度 | 订单簿、价差 |
| OKX 账户 | 账户余额 | 权益、各币种余额 |
| OKX 持仓 | 当前持仓 | 持仓列表、盈亏 |

### 指标节点

| 节点 | 功能 | 输出 |
|------|------|------|
| RSI | 相对强弱指数 | RSI 值、超买超卖信号 |
| MACD | 指数平滑异同移动平均线 | MACD 线、信号线、柱状图、金叉死叉 |
| 布林带 | 波段分析 | 上/中/下轨、价格位置 |
| 均线 | MA/EMA | 均线值、趋势判断 |

### AI 节点

| 节点 | 功能 | 输出 |
|------|------|------|
| AI 市场分析 | 综合市场分析 | 趋势判断、支撑阻力、建议 |
| 信号生成器 | 生成交易信号 | BUY/SELL/HOLD、置信度、止损止盈 |

### 风控节点

| 节点 | 功能 | 输出 |
|------|------|------|
| 风控检查 | 综合风险评估 | 通过/拒绝、原因 |
| 止损检查 | 监控止损条件 | 触发/持有 |
| 止盈检查 | 监控止盈条件 | 触发/持有 |
| 仓位计算 | 计算下单数量 | 数量、仓位比例 |

### 交易节点

| 节点 | 功能 | 输出 |
|------|------|------|
| 创建订单 | 真实下单到 OKX | 订单 ID、状态 |
| 监控订单 | 监控成交状态 | 已成交/部分/超时 |
| 取消订单 | 取消未成交订单 | 结果 |
| 查询持仓 | 查询持仓状态 | 持仓列表 |

## API 接口

所有接口以 `/api/workflow` 为前缀：

| 方法 | 路径 | 说明 |
|:---:|---|---|
| POST | `/` | 创建工作流 |
| GET | `/` | 获取工作流列表（支持分页） |
| GET | `/{id}` | 获取单个工作流 |
| PUT | `/{id}` | 更新工作流 |
| DELETE | `/{id}` | 删除工作流 |
| POST | `/{id}/run` | **执行工作流**（同步，返回各节点结果）|
| POST | `/{id}/stop` | 停止执行 |

### 执行示例

```bash
# 创建工作流
curl -X POST http://localhost:8000/api/workflow/ \
  -H "Content-Type: application/json" \
  -d '{"name": "RSI 策略", "nodes": [], "edges": []}'

# 执行工作流
curl -X POST http://localhost:8000/api/workflow/{id}/run
```

## 配置说明

### 风控参数

在 `backend/config/system_config.py` 中配置：

```python
MAX_LOSS_PCT = 0.05      # 最大亏损 5%
MAX_POSITION_PCT = 0.3    # 最大仓位 30%
```

### AI 模型

```bash
# Claude（推荐）
ANTHROPIC_API_KEY=your_key
LLM_PROVIDER=claude

# OpenAI
OPENAI_API_KEY=your_key
LLM_PROVIDER=openai
```

## 安全警告

1. **模拟盘优先** — 所有测试请在 `OKX_FLAG=1` 模拟盘进行，确认策略稳定后再考虑实盘
2. **API 密钥安全** — 不要将 API 密钥提交到 Git，使用 `.env` 文件
3. **风险控制** — 始终设置止损，控制单笔订单金额
4. **实盘切换** — 切换实盘前多次确认，先用小资金测试

## 故障排查

### OKX API 连接失败

```bash
cd backend
python -c "
from okx_api.market import MarketAPI
api = MarketAPI(flag='1')
result = api.get_ticker('BTC-USDT')
print(result)
"
```

检查：API Key 是否正确、IP 白名单、网络连接。

### AI 分析失败

确认 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 已设置且余额充足。不配置 AI 密钥时系统会使用 fallback 数据。

## 更多详情

- **实现计划**: `docs/superpowers/plans/2026-04-02-workflow-complete-flow.md`
- **设计规格**: `docs/superpowers/specs/2026-04-02-workflow-complete-flow-design.md`

---

**免责声明**: 加密货币交易具有高风险，本系统仅供学习研究使用。开发者不对任何交易亏损负责。
