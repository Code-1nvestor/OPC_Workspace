# Changelog

所有版本变更将记录在此文件中。

## [1.1.1] - 2026-08-10

### 上线就绪加固

#### 🔴 阻塞项修复
- **删除残留备份文件**: 移除 `server/index.ts.v1_backup`（空文件，旧版代码残留）
- **删除硬编码测试脚本**: 移除 `_test-m3.cjs`（含硬编码绝对路径，无法跨机器运行）
- **清理临时文件**: 移除 `vitest.config.ts.timestamp-*.mjs`、`_zip_tmp/` 目录

#### 🟡 工程化加固
- **Express 全局错误处理中间件**: 捕获未处理异常，防止连接挂起；SSE 已开始写入时不覆盖响应
- **404 兜底中间件**: API 路径返回 JSON 错误，非 API 路径由 SPA fallback 处理
- **Rate Limiting**: 接入 `express-rate-limit`，每分钟 120 次请求上限，跳过 SSE 长连接（`/api/chat`）
- **TypeScript 类型检查加固**: `npm run typecheck` 现在同时检查 `src/` 和 `server/ + electron/`（`tsc --noEmit -p tsconfig.node.json`）
- **tsconfig.node.json 修复**: 移除 `composite: true`（与 `--noEmit` 冲突），添加 `noEmit: true` 和 `lib`/`types` 配置
- **根 tsconfig 移除 references**: 避免 project reference 强制 composite 约束

#### 测试覆盖提升
- **新增 `server/__tests__/db.test.ts`**: 8 个 describe 块，覆盖 sessions/messages/todos/ongoing/countdowns/links/focus/news_cache 全部 CRUD 操作
- 使用 `:memory:` SQLite 避免影响生产数据
- 包含边界测试：progress 值 clamp 到 0-100

#### 文档更新
- **README.md 全面重写**: 项目结构、特性列表、快速开始、打包发布、测试命令、环境要求

## [1.1.2] - 2026-08-10

### 打包修复与产物生成

#### electron-builder 配置修复
- **`build.linux.target`**: `"AppImage"` → `"appImage"`（camelCase，修复 schema 验证失败）
- **`build.appImage`**: 同步修复 key 名
- **`build.win.signAndEditExecutable: false`**: 跳过 winCodeSign 下载，避免 Windows 符号链接权限问题
- **`package.json`**: 新增 `description` 和 `author` 字段
- **图标生成**: 生成合规 256×256 ICO 文件（`scripts/gen-icon.cjs`）

#### 打包产物
- **`OPC-Workbench-1.0.0-portable.exe`** (136.5 MB) — Windows portable
- **`OPC-Workbench-1.0.0-win-x64.zip`** (173.8 MB) — 完整分发包
- 产物验证: app.asar + better_sqlite3.node + express + @tencent-ai/agent-sdk + Chromium DLL 全部包含

## [1.1.0] - 2026-08-09

### M7 扩展：跨平台打包 + i18n + 自动更新

#### 跨平台打包
- **macOS**: `electron-builder --mac` 生成 DMG（x64 + arm64）
- **Linux**: `electron-builder --linux` 生成 AppImage + deb
- **Windows**: 保持原有 portable target
- **新增脚本**: `dist:win` / `dist:mac` / `dist:linux`
- **publish 配置**: GitHub Releases 自动发布

#### i18n 多语言
- **轻量 i18n 模块**: 基于 React Context，零额外依赖，支持 zh-CN（默认）和 en-US
- **`useI18n()` hook**: 提供 `t(key)` 翻译函数和 `locale` / `setLocale` 切换
- **语言持久化**: 选择存入 localStorage，默认根据浏览器语言自动检测
- **SettingsPage 语言切换 UI**: Select 下拉选择简体中文 / English
- **翻译覆盖**: 侧边栏、设置页、聊天页、工具状态、托盘菜单等 40+ 条文案

#### electron-updater 自动更新
- **`electron/main.ts`**: 集成 `autoUpdater`，启动后 10 秒自动检查更新
- **IPC 通道**: `update:check` / `update:download` / `update:install` + `update-status` 事件推送
- **`preload.ts`**: 暴露 `window.opc.update` API（check/download/install/onStatus）
- **`useUpdateChecker` hook**: 监听更新状态，通过 MessagePlugin 通知用户
- **SettingsPage 更新 UI**: 版本号标签、检查更新按钮、下载进度、安装并重启按钮
- **更新流程**: 检查 → 发现新版本 → 下载 → 安装并重启（quitAndInstall）

### 新增文件

- `src/i18n/index.tsx` - i18n 模块（Provider + useI18n hook + 翻译表）
- `src/hooks/useUpdateChecker.ts` - 自动更新检查 hook

### 依赖

- 新增: `electron-updater` (^6.3.9)

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
