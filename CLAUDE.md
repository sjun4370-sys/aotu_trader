## 习惯
编写临时工具脚本之后，使用完后必须删除

## 服务命名

- 后端服务: `backend/`
- 前端服务: `frontend/`

## API 规范

**所有提供给前端的 API 接口必须写在 `backend/api/` 模块中**

Pydantic 请求/响应模型必须放在 `api/schemas/` 目录

业务逻辑应封装在 `services/` 层，API 路由调用 services

## 项目规则

- API 密钥等敏感信息必须放在 `.env` 文件中，不要硬编码

> 项目介绍、技术栈、配置管理等详细资料请查看 [README.md](README.md)
