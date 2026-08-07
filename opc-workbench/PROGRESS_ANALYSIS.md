# OPC Workbench 项目整体进度分析

> 生成时间：2026-08-07  
> 项目：OPC Workbench（一人公司工作台）— 基于 CodeBuddy Agent SDK + Electron 的 Windows 桌面应用  
> 仓库：`E:\WorkBuddy_workspace\OPC_Workspace`  
> 最新提交：`b7a4c1a feat(release): 阶段4 便携式打包完成（M4 验收 5/5）`

---

## 一、总体进度概览

| 维度 | 状态 |
|------|------|
| 版本 | 1.0.0 |
| 里程碑 | M1 ✅ / M2 ✅ / M3 ✅ / M4 ✅ / M5 ⏳（未启动） |
| 阶段 | 阶段0 脚手架 ✅ / 阶段1 后端 ✅ / 阶段2 前端 ✅ / 阶段3 Electron ✅ / 阶段4 打包 ✅ |
| 整体完成度 | **核心 MVP 约 90%**（打包可用，5/5 验收通过） |
| 产物 | `OPC-Workbench-1.0.0-win-x64.zip`（174 MB，解压即用） |
| 源码 TODO/FIXME | **0 处**（src + server 已扫描，无遗留标记） |

**结论**：项目已达到"可交付的 v1.0 MVP"状态——一个可双击运行、常驻托盘、退出零残留的 Windows 桌面工作台，6 个核心模块全部上线。剩余工作主要集中在**工程化加固**（测试、CI、自动更新）与**功能扩展**（聊天联调、跨平台、数据导出）。

---

## 二、按模块逐一分析

### 状态图例
- ✅ **完成**：功能闭环、已验证、已提交
- 🟡 **进行中/部分完成**：主体可用但有缺口
- ⏳ **待开始**：尚未启动

---

### 1. 后端服务（Express + SQLite）

**状态：✅ 完成**

| 子模块 | 文件 | 说明 |
|--------|------|------|
| 服务入口 | `server/index.ts` | Express + SDK query 流式接口；SSE 推送；startServer(port) 导出供 Electron 内嵌 |
| 数据层 | `server/db.ts` | OPC_DB_PATH 环境变量化；6 张业务表 + 会话表；closeDb() 导出 |
| 路由 | `server/routes/*.ts` | todos / ongoing / countdowns / links / news / focus 各一套完整 CRUD |
| AI 资讯代理 | `server/routes/news.ts` | AIHOT 上游代理 + 硬编码浏览器 UA + 10min SQLite 缓存 + stale 降级 |
| 静态托管 | `server/index.ts` | OPC_EMBEDDED 模式下 SPA fallback |

**验证**：7 组 API 全部测试通过（health + 6 模块 CRUD + news 返回 7 条 AIHOT 数据）。

---

### 2. 前端工作台（React + TDesign）

**状态：✅ 完成**

| 子模块 | 文件 | 说明 |
|--------|------|------|
| 路由 | `src/App.tsx` | `/` 工作台、`/chat` 聊天、`/settings` 设置 |
| Dashboard | `src/pages/DashboardPage.tsx` | Grid 卡片墙布局 |
| 模块注册机制 | `src/modules/registry.ts` | 新模块 = 一个组件 + 一行注册 |
| API 客户端 | `src/api/client.ts` | 统一 fetch 封装 |
| 轮询 Hook | `src/hooks/useVisiblePolling.ts` | Page Visibility 感知，后台不请求 |

**6 个业务模块（全部 ✅）**：

| # | 模块 | 文件 | 跨列 | 完成度 |
|---|------|------|------|--------|
| 1 | 进行中的事项 | `OngoingModule.tsx` | 2 | ✅ |
| 2 | 待办事项 | `TodoModule.tsx` | 1 | ✅ |
| 3 | AI 最新进展 | `NewsModule.tsx` | 2 | ✅ Tabs 五分类 + 外链 |
| 4 | 重要日期倒计时 | `CountdownModule.tsx` | 1 | ✅ |
| 5 | 常用链接导航 | `LinksModule.tsx` | 1 | ✅ |
| 6 | 番茄专注钟 | `FocusModule.tsx` | 1 | ✅ SVG 圆盘 + 今日/累计统计 |

---

### 3. 聊天页（ChatPage）

**状态：🟡 进行中（约 70%）**

| 子项 | 状态 | 说明 |
|------|------|------|
| ChatPage 主体 | ✅ | 流式对话、工具调用可视化、权限卡片 |
| 无 API Key 引导 | ✅ | 缺 Key 时显示配置卡片，SDK 代码未动 |
| 会话持久化 | ✅ | SQLite 存消息 + tool_calls |
| 实际联调 | ⏳ | **阻塞**：暂无 CodeBuddy API Key，无法端到端验证真实对话 |
| 权限模式 | ✅ | default / bypassPermissions 两种 |

**说明**：聊天功能代码已就绪，但受 API Key 缺失阻塞，仅做了"无 Key 引导"的降级路径。一旦配置 Key（环境变量或 CLI 登录），即可联调。

---

### 4. 设置页（SettingsPage）

**状态：✅ 完成**

- `src/components/SettingsPage.tsx`（20KB）：Agent 增删改查 + 环境变量配置 + 登录状态检测
- 后端配合：`/api/check-login`、`/api/save-env-config`、`/api/models`

---

### 5. Electron 桌面封装

**状态：✅ 完成**

| 子项 | 文件 | 说明 |
|------|------|------|
| 主进程 | `electron/main.ts` | 单实例锁 + 内嵌 Express + 托盘 + 关闭隐藏 + 退出零残留 |
| Preload | `electron/preload.ts` | contextBridge 隔离 |
| 启动器 | `scripts/run-electron.cjs` | 清理 ELECTRON_RUN_AS_NODE / NODE_OPTIONS（关键！） |
| M3 验收 | `scripts/test-electron.cjs` | 自动化 9/9 通过 |

**关键技术决策（值得记忆）**：
- dev 模式固定 3000 端口（Vite proxy 写死），prod 用 `listen(0)` 动态端口
- Windows ESM import 需 `pathToFileURL` 转 `file://` URL
- better-sqlite3 必须 electron-rebuild（Node 22 → Electron 31 ABI 不同）

---

### 6. 便携式打包与发布

**状态：✅ 完成**

| 子项 | 文件 | 说明 |
|------|------|------|
| 打包脚本 | `scripts/assemble-release.cjs` | 以 electron/dist 为基底覆盖 resources |
| 依赖镜像 | `scripts/unpack-externals.cjs` | 手动镜像 31 个 external 依赖到 asar.unpacked |
| 压 zip | `scripts/pack-zip.cjs` | 7za 打包 |
| M4 验收 | `scripts/test-final.cjs` | 5/5 通过（启动/加载/退出/SQLite关闭/零残留） |
| 图标 | `build/icon.{png,ico}` | 256×256，纯 Node 生成 |

**产物**：`OPC-Workbench-1.0.0-win-x64.zip`（174 MB），解压即用，无需安装。

---

## 三、尚未开始的任务（M5 及以后）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P0 | 聊天端到端联调 | 待 API Key 到位后验证真实对话流、工具调用、权限交互 |
| P1 | 单元/集成测试 | 当前仅 2 个手动验收脚本（test-electron / test-final），无 Jest/Vitest |
| P1 | ESLint + Prettier | 代码风格 lint 未配置（与三语 Agent 项目的 P3 Lint 同类缺口） |
| P1 | README 更新 | 当前 README 仍是模板的 "Web Agent"，未更新为 OPC Workbench |
| P1 | CHANGELOG | 无变更日志，版本演进不可追溯 |
| P2 | CI/CD | 无 GitHub Actions，构建/测试/发布全手动 |
| P2 | 自动更新 | 未配置 electron-updater，发新版需用户手动下载 |
| P2 | 数据导出/备份 | todos/ongoing 等无导出功能，换机即丢 |
| P2 | 跨平台 | 仅 win-x64；未做 macOS（arm64）/ Linux |
| P3 | 快捷笔记模块 | 阶段0 计划中未选，可作为下一批模块 |
| P3 | 主题定制 | 已有深浅色切换，无自定义配色 |
| P3 | 多语言 i18n | 当前仅中文 |

---

## 四、阻塞问题与技术债务

### 4.1 当前阻塞项

| # | 问题 | 影响 | 缓解措施 |
|---|------|------|----------|
| 1 | **无 CodeBuddy API Key** | 聊天页无法端到端验证；只能走"无 Key 引导"降级 | 待用户配置 Key（环境变量或 `codebuddy login`） |
| 2 | **沙箱下 electron-builder 跑不通** | app.asar 被锁不能 unlink + winCodeSign 7z 解压 darwin 软链失败 | 已用三段式手动打包绕过；非沙箱环境可恢复 electron-builder |

### 4.2 技术债务

| 级别 | 债务 | 说明 |
|------|------|------|
| 中 | 无自动化测试 | 仅 2 个手动 cjs 验收脚本；回归靠人肉 |
| 中 | 无 lint/format | 代码风格靠自觉；团队协作易产生风格漂移 |
| 中 | README 落后 | 仍是模板文案，新人无法据此上手 |
| 低 | 环境变量配置仅进程级 | `save-env-config` 提示"重启需重新设置"，无持久化 |
| 低 | 缓存仅内存级 | `cachedModels` 进程重启即失效 |
| 低 | 硬编码 UA | news.ts 的 BROWSER_UA 写死 Chrome 126，未来需更新 |
| 低 | 无错误监控 | 生产环境出错只能看 stdout，无上报 |

### 4.3 已解决的关键坑（留档备忘）

- ✅ Windows ESM import 路径需 `pathToFileURL`
- ✅ `startServer(0)` 不能用 `||` 短路（0 是 falsy）
- ✅ 沙箱注入 `ELECTRON_RUN_AS_NODE=1` 会让 Electron 退化为纯 Node
- ✅ better-sqlite3 打包 Electron 必须 electron-rebuild
- ✅ node 内置 safe-delete shim 拦截 rmSync

---

## 五、后续开发计划（建议）

### 阶段5（M5）— 工程化加固（建议优先）
1. **配置 ESLint + Prettier + Husky**：统一代码风格，提交前自动检查
2. **引入 Vitest**：为 db.ts、routes、hooks 补单元测试
3. **更新 README**：替换为 OPC Workbench 实际说明（安装/使用/打包）
4. **建立 CHANGELOG.md**：从 v1.0.0 起记录变更
5. **GitHub Actions**：push 时自动 `npm run build` + lint + test

### 阶段6 — 功能完善
1. **聊天联调**：API Key 到位后补端到端测试用例
2. **数据导出**：todos/ongoing/countdowns 支持 JSON 导出/导入
3. **electron-updater**：配置自动更新（需静态托管 update.yml）
4. **快捷笔记模块**：按 registry 机制新增第 7 个模块

### 阶段7 — 扩展
1. 跨平台：macOS arm64 + Linux
2. 多语言 i18n
3. 错误上报（Sentry 或自建）

---

## 六、模块状态总表

| 模块 | 状态 | 完成度 | 备注 |
|------|------|--------|------|
| 后端服务（Express+SQLite） | ✅ 完成 | 100% | 6 路由 + 流式 chat + 静态托管 |
| 前端工作台（Dashboard+6模块） | ✅ 完成 | 100% | 全部上线，可见性轮询 |
| 聊天页（ChatPage） | 🟡 进行中 | 70% | 代码就绪，待 API Key 联调 |
| 设置页（SettingsPage） | ✅ 完成 | 100% | Agent 管理 + 环境配置 + 登录检测 |
| Electron 桌面封装 | ✅ 完成 | 100% | M3 验收 9/9 |
| 便携式打包发布 | ✅ 完成 | 100% | M4 验收 5/5，174MB zip |
| 单元/集成测试 | ⏳ 待开始 | 0% | 仅 2 个手动脚本 |
| Lint/Format 配置 | ⏳ 待开始 | 0% | 无 eslint/prettier |
| CI/CD | ⏳ 待开始 | 0% | 全手动构建 |
| 自动更新 | ⏳ 待开始 | 0% | 无 electron-updater |
| README/CHANGELOG | ⏳ 待开始 | 10% | README 落后，无 CHANGELOG |

**总体：核心 MVP 完成，可交付；工程化与扩展项待启动。**
