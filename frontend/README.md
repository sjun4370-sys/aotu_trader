# Aotu Trader Frontend

工作流可视化交易策略编辑器前端

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4 + CSS Modules
- **流程图**: @xyflow/react (React Flow)
- **桌面应用**: Tauri 2
- **状态管理**: React Hooks + Zustand
- **测试**: Vitest + Playwright

## 目录结构

```
src/
├── assets/           # 静态资源
├── components/       # React 组件
│   ├── ui/          # 通用 UI 组件库
│   ├── node-content/ # 工作流节点内容组件
│   └── workflow/    # 工作流编辑器组件
├── constants/        # 应用常量
├── hooks/           # 自定义 React Hooks
├── lib/             # 第三方库封装
├── services/        # API 服务层
├── store/           # 状态管理
├── styles/          # 全局样式
├── types/           # TypeScript 类型定义
└── utils/           # 工具函数
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 类型检查
npm run build

# 代码检查
npm run lint

# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# Tauri 开发
npm run tauri dev
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置:

```
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=Aotu Trader
```

## 工作流编辑器

工作流编辑器采用节点-连线模型:

- **节点类型**: currency, market, account, indicator, strategy, analysis, trade, condition, loop
- **节点分类**: currency, data, strategy, ai, tool
- **交互**: 拖拽创建、连线、配置、删除
