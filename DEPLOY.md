# AI量化交易系统 - 部署指南

## 🎯 系统概述

这是一个**真正可用的**AI量化交易系统，特点：

- ✅ **真实OKX API连接** - 行情、交易、账户都是真实的
- ✅ **真实技术指标** - 使用TA-Lib计算RSI、MACD、布林带等
- ✅ **真实AI分析** - 调用Claude/OpenAI进行市场分析
- ✅ **真实风控** - 仓位控制、止损止盈、最大亏损限制
- ✅ **真实下单** - 真实的买卖订单到OKX交易所
- ✅ **可视化工作流** - 拖拽式策略编排

## 📋 前置要求

### 1. 硬件要求
- CPU: 2核+
- 内存: 4GB+
- 存储: 10GB+
- 网络: 稳定连接OKX服务器

### 2. 软件要求
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ (可选，目前使用SQLite)

### 3. 账户要求
- OKX账户（建议先使用模拟盘）
- Claude/OpenAI API密钥（可选）

## 🚀 快速部署

### 步骤1：克隆代码

```bash
cd D:\home\code\aotu_trader\.worktrees\workflow-mgmt
```

### 步骤2：配置环境变量

创建 `.env` 文件：

```bash
# OKX API配置（必需）
export OKX_API_KEY='你的OKX API Key'
export OKX_SECRET_KEY='你的OKX Secret Key'
export OKX_PASSPHRASE='你的OKX Passphrase'
export OKX_FLAG='1'  # '1' = 模拟盘，'0' = 实盘（请谨慎！）

# AI配置（可选）
export ANTHROPIC_API_KEY='你的Claude API Key'
# 或
export OPENAI_API_KEY='你的OpenAI API Key'
export LLM_PROVIDER='claude'  # claude 或 openai

# 风险控制配置（可选）
export MAX_LOSS_PCT='0.05'  # 最大亏损5%
export MAX_POSITION_PCT='0.3'  # 最大仓位30%
```

**获取OKX API Key：**
1. 登录OKX官网
2. 进入 "API" 页面
3. 创建API Key，勾选 "读取" 和 "交易" 权限
4. 复制API Key、Secret Key和Passphrase

### 步骤3：安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

**requirements.txt 需要添加：**
```
# 现有依赖...
anthropic>=0.25.0
openai>=1.0.0
pandas>=2.0.0
numpy>=1.24.0
TA-Lib>=0.4.28
```

### 步骤4：安装前端依赖

```bash
cd ../frontend
npm install
```

### 步骤5：初始化系统

```bash
cd ../backend
python scripts/init_system.py
```

如果配置正确，你会看到：
```
✅ 系统初始化完成！

系统状态:
  📊 行情数据: 已连接
  💰 交易功能: 已启用
  🤖 AI分析: 已启用
  🛡️ 风险控制: 已启用
```

### 步骤6：启动服务

**终端1 - 启动后端：**
```bash
cd backend
uvicorn api.main:app --reload --port 8000
```

**终端2 - 启动前端：**
```bash
cd frontend
npm run dev
```

### 步骤7：访问系统

打开浏览器访问：http://localhost:5173/

1. 首页是工作流列表
2. 点击 "新建工作流" 进入编辑器
3. 从左侧面板拖拽节点到画布
4. 连接节点形成策略
5. 配置节点参数
6. 点击 "运行" 执行策略

## 📊 节点说明

### 数据节点（OKX真实API）

| 节点 | 功能 | 输出 |
|------|------|------|
| 📊 OKX行情 | 获取实时ticker | 价格、24h涨跌、买卖盘 |
| 📈 OKX K线 | 获取历史K线 | OHLCV数据 |
| 📖 OKX订单簿 | 获取买卖深度 | 订单簿、价差 |
| 💰 OKX账户 | 查询账户余额 | 权益、各币种余额 |
| 📋 OKX持仓 | 查询当前持仓 | 持仓列表、盈亏 |

### 指标节点（TA-Lib真实计算）

| 节点 | 功能 | 输出 |
|------|------|------|
| 📉 RSI指标 | 计算RSI | RSI值、超买超卖信号 |
| 📊 MACD指标 | 计算MACD | MACD线、信号线、柱状图 |
| 🎯 布林带 | 计算布林带 | 上/中/下轨 |
| 📈 移动平均线 | 计算MA/EMA | 均线值、趋势判断 |

### AI节点（真实LLM调用）

| 节点 | 功能 | 输出 |
|------|------|------|
| 🤖 AI市场分析 | 综合分析市场 | 趋势判断、支撑阻力、建议 |
| ⚡ 信号生成器 | 生成交易信号 | BUY/SELL/HOLD信号 |

### 风控节点（真实风控）

| 节点 | 功能 | 输出 |
|------|------|------|
| 🛡️ 风控检查 | 综合风险检查 | 通过/拒绝 |
| 🛑 止损检查 | 监控止损条件 | 触发/持有 |
| ✅ 止盈检查 | 监控止盈条件 | 触发/持有 |
| ⚖️ 仓位计算 | 计算下单数量 | 数量、价值 |

### 交易节点（真实下单）

| 节点 | 功能 | 输出 |
|------|------|------|
| 📝 创建订单 | 真实下单到OKX | 订单ID、状态 |
| 👁️ 监控订单 | 监控成交状态 | 已成交/部分/超时 |
| ❌ 取消订单 | 取消未成交订单 | 结果 |
| 🔍 查询持仓 | 查询持仓状态 | 持仓列表 |

## 🔧 配置说明

### 1. 风险控制

编辑 `backend/config/system_config.py`：

```python
# 最大亏损比例（默认5%）
MAX_LOSS_PCT=0.05

# 最大仓位比例（默认30%）
MAX_POSITION_PCT=0.3
```

### 2. AI模型选择

支持两种LLM提供商：

**Claude (推荐)：**
```bash
export ANTHROPIC_API_KEY='your_key'
export LLM_PROVIDER='claude'
export LLM_MODEL='claude-3-sonnet-20240229'
```

**OpenAI：**
```bash
export OPENAI_API_KEY='your_key'
export LLM_PROVIDER='openai'
export LLM_MODEL='gpt-4'
```

### 3. 交易模式切换

**模拟盘（推荐用于测试）：**
```bash
export OKX_FLAG='1'
```

**实盘（请谨慎！）：**
```bash
export OKX_FLAG='0'
```

## 🧪 测试策略

### 示例1：RSI策略

1. 拖拽节点：
   - 开始 → OKX K线 → RSI指标 → AI市场分析 → 信号生成器 → 风控检查 → 创建订单 → 监控订单

2. 配置参数：
   - OKX K线: inst_id=BTC-USDT, bar=1H, limit=100
   - RSI: period=14
   - AI分析: provider=claude

3. 点击运行

### 示例2：MACD策略

1. 拖拽节点：
   - 开始 → OKX K线 → MACD指标 → 信号生成器 → 仓位计算 → 创建订单

2. 配置参数：
   - MACD: fast=12, slow=26, signal=9

## ⚠️ 安全警告

1. **模拟盘优先**
   - 所有测试请在模拟盘进行
   - 确认策略稳定后再考虑实盘

2. **API密钥安全**
   - 不要将API密钥提交到Git
   - 使用环境变量或配置文件
   - 定期更换API密钥

3. **风险控制**
   - 始终设置止损
   - 控制单笔订单金额
   - 监控总体风险暴露

4. **实盘切换警告**
   - 切换实盘前请多次确认
   - 先用小资金测试
   - 准备好紧急停止方案

## 🔍 故障排查

### 问题1：OKX API连接失败

**症状：** 初始化时报错或返回空数据

**排查：**
```bash
# 测试API连接
cd backend
python -c "
from okx_api.market import MarketAPI
api = MarketAPI(flag='1')
result = api.get_ticker('BTC-USDT')
print(result)
"
```

**解决：**
- 检查API Key是否正确
- 检查IP白名单设置
- 检查网络连接

### 问题2：AI分析失败

**症状：** AI节点返回模拟数据或报错

**排查：**
```bash
# 检查环境变量
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

**解决：**
- 确认API Key已设置
- 检查API余额
- 可以不设置AI，系统会使用模拟分析

### 问题3：交易下单失败

**症状：** 创建订单节点报错

**排查：**
```bash
# 检查账户余额
python scripts/check_account.py
```

**解决：**
- 确认账户有余额
- 确认交易对可用
- 检查订单金额是否超过限制

## 📈 性能优化

### 1. 高频交易优化

如果需要更高频率：

```python
# 使用WebSocket替代轮询
okx_manager.market.subscribe_ticker('BTC-USDT', callback)
```

### 2. 数据库优化

大量历史数据时，建议迁移到PostgreSQL + TimescaleDB

### 3. 缓存优化

启用Redis缓存行情数据

## 📝 更新日志

### v1.0.0 (当前)
- ✅ 真实的OKX API集成
- ✅ 真实的TA-Lib指标计算
- ✅ 真实的AI分析（Claude/OpenAI）
- ✅ 真实的风控系统
- ✅ 真实的交易执行
- ✅ 可视化工作流编辑器

### 后续计划
- [ ] 回测系统
- [ ] 多交易所支持
- [ ] 更多技术指标
- [ ] 机器学习模型训练
- [ ] 移动端支持

## 🤝 支持

遇到问题请：
1. 查看日志文件 `backend/logs/`
2. 检查系统状态 `python scripts/init_system.py`
3. 查看API文档 https://www.okx.com/docs-v5/

## 📄 许可证

MIT License

---

**免责声明：** 本系统仅供学习和研究使用。加密货币交易具有高风险，请自行承担交易风险。开发者不对任何交易亏损负责。
