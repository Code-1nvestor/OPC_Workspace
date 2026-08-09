# Changelog

所有版本变更将记录在此文件中。

## [1.0.2] - 2026-08-09

### 技术债清理

- **TypeScript 全量 0 错误**: 修复前端 3 个文件遗留的 11 处 TS 报错（TDesign 组件属性、lucide 图标类型、Descriptions 用法等）
- **ESLint 0 错误**: 清理前端/服务端遗留的 unused-vars、prefer-const、no-unused-expressions 等问题
- **ESLint 配置迁移**: `.eslintrc.cjs` 迁移为 `eslint.config.mjs`（flat config），react-hooks 仅启用经典两条规则（`rules-of-hooks` / `exhaustive-deps`），避免 v7 激进规则误报

### 工程化加固 (M5)

- **package.json 新增脚本**:
  - `typecheck` - `tsc --noEmit`
  - `lint` / `lint:fix` - ESLint 检查/自动修复
  - `format` / `format:check` - Prettier 格式化/校验
  - `test` / `test:watch` - Vitest 单元测试
- **单元测试**: 接入 Vitest，为 3 个 Provider 编写单测（mock fetch）
  - `openai.test.ts` - SSE 流式解析、错误兜底、未配置 Key
  - `anthropic.test.ts` - SSE 解析、请求头校验
  - `index.test.ts` - Provider 工厂按 `LLM_PROVIDER` 路由、可用性列表（mock CodeBuddy SDK 认证）
- **CI**: 新增 `.github/workflows/ci.yml`，推送/PR 时自动执行 typecheck + lint + test + build

### 新增文件

- `vitest.config.ts` - Vitest 配置
- `server/providers/__tests__/openai.test.ts`
- `server/providers/__tests__/anthropic.test.ts`
- `server/providers/__tests__/index.test.ts`
- `.github/workflows/ci.yml`

### 依赖

- 新增: `vitest`

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
- `eslint.config.mjs` - ESLint flat config 配置
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
