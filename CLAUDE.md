## 技术栈

- 后端: FastAPI + SQLAlchemy + SQLite
- 前端: React 19 + TypeScript + Vite + Tauri
- 指标: pandas / numpy（无 TA-Lib）
- AI: Claude ( Anthropic ) / GPT ( OpenAI )

## 快速启动

```bash
# 后端
cd backend && pip install -r requirements.txt && uvicorn api.main:app --reload --port 8000

# 前端
cd frontend && npm install && npm run tauri dev

# 测试
cd frontend && npm test
```

## 项目约定

- 临时工具脚本用完必须删除
- API 密钥放 `.env`，不硬编码
- 后端入口: `backend/api/main.py`
- 前端入口: `frontend/src/`

## API 规范

所有前端 API 写在 `backend/api/` 模块，Pydantic 模型在 `api/schemas/`，业务逻辑在 `services/` 层

## 节点执行器规范

所有节点执行器统一签名：

```python
async def execute_node(
    node_id: str,
    node_type: str,
    inputs: Dict[str, NodeOutput],  # 前置节点输出
    config: Dict,
    context: ExecutionContext
) -> NodeOutput:
```

外层统一用 `engine/node_output.py` 的 `NodeOutput` dataclass 包装。

> 详细项目资料见 [README.md](README.md)
