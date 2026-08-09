# Changelog

所有版本变更将记录在此文件中。

## [1.0.3] - 2026-08-09

### Provider 切换自动重启

- **`/api/restart-server` 端点**: 新增 `restartServer()` 导出函数，关闭旧 Express 实例后重新 `app.listen` 同端口
- **SettingsPage 联动**: 切换 Provider 后自动调用 `api.restartServer()`，确保全新 server 状态；重启失败时回退到热重载（`resetProviderCache` 已生效）
- **UI 反馈**: 切换按钮显示"切换中"状态，成功后提示"服务已重启"

### 工具调用结果 UI 可视化

- **Agnes 5 个内置工具专属渲染**: `get_todos` / `create_todo` / `get_ongoing` / `get_countdowns` / `get_news` 在 `ToolCallsCollapse` 中有了专属图标和展示
  - 智能解析 JSON 结果：列表数据自动编号展示，支持 `title` / `done` / `progress` 等字段格式化
  - `create_todo` 显示 `title` 参数摘要
  - 非 JSON 结果回退为纯文本展示
  - 每个工具有独立颜色和 lucide 图标（ListChecks / PlusCircle / Zap / Calendar / Newspaper）

### 设置导入/导出

- **`GET /api/settings/export`**: 导出当前 Provider 配置为 JSON（**不含 API Key**，只标注 `apiKeyConfigured` 布尔值）
- **`POST /api/settings/import`**: 导入 Provider 配置（baseUrl / model / internetEnv 等），同步 `process.env` + 持久化 `.env` + 热重载
- **SettingsPage UI**: 新增"导出设置"和"导入设置"按钮，导入通过隐藏 file input 选择 JSON 文件

### 新增端点

- `POST /api/restart-server` - 重启 Express server
- `GET /api/settings/export` - 导出设置（不含 Key）
- `POST /api/settings/import` - 导入设置

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
