# OPC Workbench

一个基于 CodeBuddy Agent SDK 构建的本地 AI 助手桌面应用，支持多模型 Provider 切换。

## 特性

- 💬 **多 Provider 支持** - 支持 CodeBuddy SDK、火山 GLM-5.2、Agnes (OpenAI) 三种 LLM Provider，可在设置页一键切换
- 🔧 **工具调用** - Agnes Provider 内置待办事项管理、倒计时、新闻资讯等工具调用
- 🔒 **权限控制** - 支持多种权限模式，工具调用需用户确认
- 📝 **会话管理** - 多会话切换和持久化，聊天历史保存到 SQLite
- 🎨 **主题切换** - 支持深色/浅色主题
- 📱 **桌面应用** - Electron 打包，跨平台运行

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + TypeScript |
| 前端 | React 18 + TypeScript + Vite |
| UI | TDesign React 组件库 + Tailwind CSS |
| AI | 多 Provider 架构（CodeBuddy / Anthropic / OpenAI） |
| 数据库 | SQLite (better-sqlite3) |
| 桌面 | Electron |

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

# CodeBuddy 配置
CODEBUDDY_API_KEY=your_api_key

# 或 Agnes (OpenAI) 配置
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_agnes_api_key
# OPENAI_BASE_URL=https://apihub.agnes-ai.com/v1
# OPENAI_MODEL=agnes-2.0-flash

# 或 火山 GLM-5.2 配置
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_api_key
# ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
# ANTHROPIC_MODEL=glm-5-flash
```

### 3. 启动开发服务器

```bash
npm run dev
```

这会同时启动前端（端口 5173）和后端（端口 3000）。

### 4. 访问应用

打开浏览器访问 http://localhost:5173

## Provider 切换

在应用内点击左下角「设置」按钮，在「LLM Provider」部分可以看到所有可用的 Provider：

| Provider | 说明 | 需要配置 |
|----------|------|----------|
| CodeBuddy | 默认 Provider，功能最全 | `CODEBUDDY_API_KEY` |
| Anthropic (火山) | GLM-5.2 模型，兼容 Anthropic API | `ANTHROPIC_API_KEY` |
| OpenAI (Agnes) | 新加坡免费模型，支持工具调用 | `OPENAI_API_KEY` |

切换时只需在设置页点击对应 Provider 的「切换」按钮，服务会自动重启。

## 构建发行版

```bash
# 构建并打包为 zip
npm run dist:final

# 输出目录: release/OPC-Workbench-1.0.0.zip
```

## 代码规范

项目使用 ESLint + Prettier 进行代码规范检查：

```bash
# 检查代码
npx eslint src/**/*.ts src/**/*.tsx server/**/*.ts

# 自动修复
npx eslint src/**/*.ts src/**/*.tsx server/**/*.ts --fix

# 格式化
npx prettier --write "src/**/*.{ts,tsx}" "server/**/*.ts"
```

## 目录结构

```
opc-workbench/
├── src/                    # 前端源码
│   ├── api/               # API 客户端
│   ├── components/        # React 组件
│   ├── pages/             # 页面组件
│   └── hooks/             # 自定义 Hooks
├── server/                 # 后端服务
│   ├── providers/         # LLM Provider 实现
│   ├── db.js              # SQLite 数据库操作
│   └── index.ts           # Express 服务器入口
├── electron/              # Electron 主进程
├── release/               # 构建输出
└── .env                   # 环境变量配置
```

## 许可证

MIT
