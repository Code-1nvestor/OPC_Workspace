# OPC Workbench

一人公司工作台 — 基于 CodeBuddy Agent SDK + Electron 的本地 AI 助手桌面应用，支持多 LLM Provider 一键切换。

## 特性

- 🔄 **多 Provider 支持** — CodeBuddy SDK / 火山 GLM-5.2 / Agnes (OpenAI 兼容) 三种 Provider，设置页一键切换
- 🔧 **工具调用** — Agnes Provider 内置待办、倒计时、新闻等 5 个工具调用；可视化展示 Agent 工具使用过程
- 🔒 **权限控制** — default / acceptEdits / plan / bypassPermissions 四种模式
- 📝 **会话管理** — 多会话切换、SQLite 持久化、聊天历史保存
- 🎨 **主题切换** — 深色 / 浅色主题
- 🖥️ **桌面应用** — Electron 打包，跨平台运行 (Windows / macOS / Linux)
- 📊 **工作台模块** — 待办事项、进行中任务、AI 资讯、倒计时、常用链接、番茄专注钟
- 🌐 **多语言** — 简体中文 / English
- 🔄 **自动更新** — electron-updater 集成，支持 GitHub Releases 自动检查和安装更新

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + TypeScript |
| 前端 | React 18 + TypeScript + Vite |
| UI | TDesign React 组件库 + Tailwind CSS |
| AI | 多 Provider 架构 (CodeBuddy / Anthropic / OpenAI) |
| 数据库 | SQLite (better-sqlite3) |
| 桌面 | Electron + electron-updater |
| 测试 | Vitest |
| 代码规范 | ESLint + Prettier |
| CI | GitHub Actions |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

复制并编辑 `.env` 文件：

```bash
# 选择 LLM Provider: codebuddy | anthropic | openai
LLM_PROVIDER=codebuddy

# CodeBuddy 配置（CLI 登录方式）
# 执行 codebuddy login 后无需 API Key

# 或使用 Agnes (OpenAI 兼容)
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_agnes_api_key
# OPENAI_BASE_URL=https://apihub.agnes-ai.com/v1
# OPENAI_MODEL=agnes-2.0-flash

# 或使用火山 GLM-5.2
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_api_key
# ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
# ANTHROPIC_MODEL=glm-5.2
```

### 3. 启动开发服务器

```bash
npm run dev
```

前端运行在 http://localhost:5173，后端在 http://localhost:3000。

### 4. Electron 桌面模式

```bash
npm run dev:electron     # 开发模式
npm run start:electron   # 生产模式
```

## 打包发布

```bash
npm run dist:win         # Windows portable
npm run dist:mac         # macOS DMG
npm run dist:linux       # Linux AppImage + deb
npm run dist:final       # 便携式 zip 打包（Windows）
```

## 测试与代码质量

```bash
npm run typecheck        # TypeScript 类型检查
npm run lint             # ESLint 检查
npm run test             # Vitest 单元测试
npm run format           # Prettier 格式化
```

## 环境要求

- Node.js 18+
- npm 9+

## 项目结构

```
opc-workbench/
├── electron/          # Electron 主进程 + preload
├── server/            # Express 后端
│   ├── providers/     # LLM Provider 抽象层
│   ├── routes/        # API 路由
│   ├── db.ts          # SQLite 数据层
│   └── index.ts       # 服务入口
├── src/               # React 前端
│   ├── components/    # UI 组件
│   ├── hooks/         # React Hooks
│   ├── modules/       # 工作台模块
│   ├── pages/         # 页面
│   ├── api/           # API 客户端
│   └── i18n/          # 国际化
├── scripts/           # 打包与测试脚本
└── .github/workflows/ # CI
```

## License

MIT
