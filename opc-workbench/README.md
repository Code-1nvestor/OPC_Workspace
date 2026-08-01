# Web Agent

一个基于 CodeBuddy Agent SDK 构建的 Web Agent 应用模板。

## 特性

- 💬 **流式对话** - 实时显示 AI 回复
- 🔧 **工具调用** - 可视化展示 Agent 工具使用
- 🔒 **权限控制** - 支持多种权限模式
- 📝 **会话管理** - 多会话切换和持久化
- 🎨 **主题切换** - 支持深色/浅色主题
- 🤖 **自定义 Agent** - 创建和管理多个 Agent 配置

## 技术栈

- **后端**: Node.js + Express + TypeScript
- **前端**: React 18 + TypeScript + Vite
- **UI**: TDesign React 组件库
- **AI**: CodeBuddy Agent SDK
- **数据库**: SQLite (better-sqlite3)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

这会同时启动前端（端口 5173）和后端（端口 3000）

### 3. 访问应用

打开浏览器访问 http://localhost:5173

## 环境要求

- Node.js 18+
- npm 或 yarn

## 配置

### 方式一：环境变量配置

创建 `.env` 文件：

```bash
PORT=3000
CODEBUDDY_API_KEY=your_api_key
CODEBUDDY_AUTH_TOKEN=your_auth_token
CODEBUDDY_BASE_URL=https://api.example.com
CODEBUDDY_INTERNET_ENVIRONMENT=external
```

### 方式二：使用 CodeBuddy CLI 登录

```bash
codebuddy login
npm run dev
```

## License

MIT
