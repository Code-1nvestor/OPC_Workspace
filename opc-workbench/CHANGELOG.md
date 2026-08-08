# Changelog

所有版本变更将记录在此文件中。

## [1.0.1] - 2026-08-01

### 新增

- **多 Provider 架构**: 新增 Provider 抽象层，支持三种 LLM Provider：
  - `codebuddy` - CodeBuddy Agent SDK（默认）
  - `anthropic` - 火山 CodingPlan GLM-5.2
  - `openai` - Agnes 新加坡免费模型
- **Provider 切换 UI**: 在设置页新增 Provider 列表，支持一键切换 LLM Provider
- **Agnes Provider 工具调用**: 内置 5 个工具：
  - `get_todos` - 获取待办事项列表
  - `create_todo` - 创建新待办事项
  - `get_ongoing` - 获取进行中任务
  - `get_countdowns` - 获取倒计时列表
  - `get_news` - 获取新闻资讯
- **环境变量支持**: `.env` 文件支持配置所有 3 个 Provider 的参数

### 改进

- **统一聊天接口**: 前端 SSE 解析层无需修改，Provider 层自动适配
- **错误提示优化**: 无 API Key 时显示更清晰的引导信息
- **代码规范**: 新增 ESLint + Prettier 配置

### 新增文件

- `server/providers/types.ts` - Provider 接口定义
- `server/providers/codebuddy.ts` - CodeBuddy Provider 实现
- `server/providers/anthropic.ts` - Anthropic (火山) Provider 实现
- `server/providers/openai.ts` - OpenAI (Agnes) Provider 实现
- `server/providers/index.ts` - Provider 工厂函数
- `.eslintrc.cjs` - ESLint 配置
- `.prettierrc` - Prettier 配置
- `CHANGELOG.md` - 变更记录

### 更新文件

- `server/index.ts` - 重构为多 Provider 架构
- `src/components/SettingsPage.tsx` - 新增 Provider 切换 UI
- `src/api/client.ts` - 新增 Provider API 方法
- `src/pages/ChatPage.tsx` - 优化登录状态展示
- `.env.example` - 更新环境变量说明
- `README.md` - 更新文档

### 依赖

- 新增: `eslint`, `prettier`, `eslint-config-prettier`
- 新增: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- 新增: `eslint-plugin-react`, `eslint-plugin-react-hooks`

## [1.0.0] - 2026-07-28

### 初始版本

- 基于 CodeBuddy Agent SDK 的桌面应用
- 流式对话界面
- SQLite 本地数据库存储
- Electron 打包发行
