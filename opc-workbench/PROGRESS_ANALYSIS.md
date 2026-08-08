# OPC Workbench 项目整体进度分析（v2）

> 更新时间：2026-08-08  
> 项目：OPC Workbench（一人公司工作台）- 基于 CodeBuddy Agent SDK + Electron 的 Windows 桌面应用  
> 仓库：`E:\WorkBuddy_workspace\OPC_Workspace`  
> 最新提交：`bf0b3e2 feat: 多 LLM Provider 架构 - 支持 CodeBuddy/火山GLM-5.2/Agnes 切换`  
> 源码规模：7,510 行 TypeScript/TSX（src + server + electron）  
> 源码 TODO/FIXME：0 处

---

## 一、总体进度概览

| 维度 | 状态 |
|------|------|
| 版本 | 1.0.0 |
| 里程碑 | M1 ✅ / M2 ✅ / M3 ✅ / M4 ✅ / M5 ⏳（未启动） |
| 阶段 | 阶段0-4 ✅ + 多 Provider 架构 ✅ |
| 整体完成度 | **核心 MVP 约 95%**（聊天页已解锁，三 Provider 可切换） |
| 产物 | `OPC-Workbench-1.0.0-win-x64.zip`（174 MB，解压即用） |
| 源码 TODO/FIXME | **0 处** |

### v1 → v2 变化摘要

| 变化项 | v1（8/7） | v2（8/8） |
|--------|-----------|-----------|
| 聊天页状态 | 🟡 70%（阻塞于无 API Key） | ✅ 95%（CodeBuddy 已登录，API 验证通过） |
| LLM 架构 | 硬绑定 CodeBuddy SDK | 三 Provider 抽象层（CodeBuddy / 火山 GLM / Agnes） |
| 源码行数 | 6,746 | 7,510（+764 行 Provider 层） |
| 阻塞项 | 2 项 | 1 项（沙箱 electron-builder，已绕过） |
| 整体完成度 | ~90% | ~95% |

---

## 二、按模块逐一分析

### 状态图例
- ✅ **完成**：功能闭环、已验证、已提交
- 🟡 **进行中/部分完成**：主体可用但有缺口
- ⏳ **待开始**：尚未启动

---

### 1. 后端服务（Express + SQLite + Provider 层）

**状态：✅ 完成**

| 子模块 | 文件 | 说明 |
|--------|------|------|
| 服务入口 | `server/index.ts` | Express + Provider 统一流式接口；SSE 推送；startServer(port) 导出 |
| **Provider 抽象层** | `server/providers/` (5 文件) | **新增**：统一 ChatProvider 接口，三 Provider 可切换 |
| 数据层 | `server/db.ts` | 8 张表（sessions/messages + 6 业务表）；WAL 模式；closeDb() 导出 |
| 路由 | `server/routes/*.ts` | todos / ongoing / countdowns / links / news / focus 各一套完整 CRUD |
| AI 资讯代理 | `server/routes/news.ts` | AIHOT 代理 + 浏览器 UA + 10min SQLite 缓存 + stale 降级 |
| 静态托管 | `server/index.ts` | OPC_EMBEDDED 模式下 SPA fallback |
| **Provider 管理 API** | `/api/providers`、`/api/providers/switch` | **新增**：列出可用 Provider、运行时切换 |

**Provider 层详情**：

| 文件 | 行数 | 说明 |
|------|------|------|
| `types.ts` | 60 | 统一 ChatProvider 接口 + ChatEvent 类型（与前端 SSE 兼容） |
| `codebuddy.ts` | 115 | 提取 SDK query() 逻辑，保留工具调用 + 权限交互 |
| `anthropic.ts` | 110 | 火山 GLM-5.2，Anthropic Messages API，SSE 流式 |
| `openai.ts` | 260 | Agnes（OpenAI 兼容），流式 + **function calling 工具调用**（5 个内置工具） |
| `index.ts` | 55 | Provider 工厂 + 路由（LLM_PROVIDER 环境变量选择） |

**验证**：API 全部测试通过 — health ✅、check-login ✅（isLoggedIn: true）、providers ✅（CodeBuddy available）、models ✅（返回 14 个模型含 GLM-5.2 / Kimi-K3 / Deepseek-V4 等）。

---

### 2. 前端工作台（React + TDesign）

**状态：✅ 完成**

| 子模块 | 文件 | 说明 |
|--------|------|------|
| 路由 | `src/App.tsx` | `/` 工作台、`/chat` 聊天、`/settings` 设置 |
| Dashboard | `src/pages/DashboardPage.tsx` | 3 列 Grid 卡片墙 + 单卡片/全部刷新 |
| 模块注册机制 | `src/modules/registry.ts` | 新模块 = 一个组件 + 一行注册 |
| API 客户端 | `src/api/client.ts` | 统一 fetch 封装 + **新增** getProviders/switchProvider |
| 轮询 Hook | `src/hooks/useVisiblePolling.ts` | Page Visibility 感知，后台不请求 |

**6 个业务模块（全部 ✅）**：

| # | 模块 | 文件 | 跨列 | 亮点 |
|---|------|------|------|------|
| 1 | 进行中的事项 | `OngoingModule.tsx` | 2 | 进度条 + 状态管理 |
| 2 | 待办事项 | `TodoModule.tsx` | 1 | 勾选 + 备注 |
| 3 | AI 最新进展 | `NewsModule.tsx` | 2 | Tabs 五分类 + 外链 + 相对时间 |
| 4 | 重要日期倒计时 | `CountdownModule.tsx` | 1 | 日期计算 + 颜色标记 |
| 5 | 常用链接导航 | `LinksModule.tsx` | 1 | 排序 + 图标 |
| 6 | 番茄专注钟 | `FocusModule.tsx` | 1 | SVG 圆盘 + 今日/累计统计 |

---

### 3. 聊天页（ChatPage）

**状态：✅ 完成（约 95%）**

| 子项 | 状态 | 说明 |
|------|------|------|
| ChatPage 主体 | ✅ | 流式对话、工具调用可视化、权限卡片 |
| 无 Key 引导 | ✅ | **更新**：适配多 Provider 引导文案（列出三套配置方式） |
| 会话持久化 | ✅ | SQLite 存消息 + tool_calls |
| **CodeBuddy 联调** | ✅ | **已解锁**：CLI 登录成功，check-login 返回 isLoggedIn: true |
| 权限模式 | ✅ | default / bypassPermissions 两种 |
| **多 Provider 切换** | ✅ | **新增**：通过 .env LLM_PROVIDER 切换，前端 SSE 解析零改动 |
| Agnes/火山 联调 | 🟡 | 代码就绪，待用户填入 API Key 后验证 |
| 前端 Provider 切换 UI | ⏳ | 后端 API 已就绪（/api/providers/switch），前端 SettingsPage 尚未增加切换控件 |

**说明**：聊天页核心阻塞已解除。CodeBuddy CLI 登录成功后，`/api/check-login` 返回 `isLoggedIn: true`，聊天页不再显示引导卡片，可直接对话。可用模型包括 Auto / GLM-5.2 / Kimi-K3 / Deepseek-V4 等 14 个。

---

### 4. 设置页（SettingsPage）

**状态：✅ 完成（基础功能）**

- `src/components/SettingsPage.tsx`（20KB）：Agent 增删改查 + 环境变量配置 + 登录状态检测
- 后端配合：`/api/check-login`、`/api/save-env-config`、`/api/models`、`/api/providers`
- **待补充**：Provider 切换 UI 控件（后端 API 已就绪，前端尚未加）

---

### 5. Electron 桌面封装

**状态：✅ 完成**

| 子项 | 文件 | 说明 |
|------|------|------|
| 主进程 | `electron/main.ts` | 单实例锁 + 内嵌 Express + 托盘 + 关闭隐藏 + 退出零残留 |
| Preload | `electron/preload.ts` | contextBridge 隔离 |
| 启动器 | `scripts/run-electron.cjs` | 清理 ELECTRON_RUN_AS_NODE / NODE_OPTIONS |
| M3 验收 | `scripts/test-electron.cjs` | 自动化 9/9 通过 |

---

### 6. 便携式打包与发布

**状态：✅ 完成**

| 子项 | 文件 | 说明 |
|------|------|------|
| 打包脚本 | `scripts/assemble-release.cjs` | 以 electron/dist 为基底覆盖 resources |
| 依赖镜像 | `scripts/unpack-externals.cjs` | 手动镜像 31 个 external 依赖 |
| 压 zip | `scripts/pack-zip.cjs` | 7za 打包 |
| M4 验收 | `scripts/test-final.cjs` | 5/5 通过 |
| 图标 | `build/icon.{png,ico}` | 256×256 |

**产物**：`OPC-Workbench-1.0.0-win-x64.zip`（174 MB），解压即用。

**注意**：多 Provider 架构是昨天新增的，尚未重新打包。下次打包需包含 `server/providers/` 目录。

---

### 7. 多 LLM Provider 架构（新增模块）

**状态：✅ 完成**

| Provider | 模型 | 费用 | 工具调用 | 联调状态 |
|----------|------|------|---------|---------|
| CodeBuddy | Claude/GLM-5.2/Kimi-K3/Deepseek-V4 等 14 个 | 免费额度 + Pro | ✅ SDK 原生 | ✅ 已验证 |
| Anthropic (火山) | GLM-5.2 | 当前免费 | ❌ 纯文本 | 🟡 待填 Key |
| OpenAI (Agnes) | agnes-2.0-flash | **免费** $0/1M tokens | ✅ function calling（5 工具） | 🟡 待填 Key |

**Agnes Provider 内置工具**：get_todos / create_todo / get_ongoing / get_countdowns / get_news

**切换方式**：`.env` 中改 `LLM_PROVIDER=codebuddy|anthropic|openai`，重启即可。

---

## 三、尚未开始的任务

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | 前端 Provider 切换 UI | SettingsPage 增加 Provider 下拉选择控件（后端 API 已就绪） |
| P1 | 重新打包含 Provider 层 | 当前 zip 不含 server/providers/，需重新 dist:final |
| P1 | 单元/集成测试 | 仅 2 个手动验收脚本，无 Vitest/Jest |
| P1 | ESLint + Prettier | 代码风格 lint 未配置 |
| P1 | README 更新 | 仍是模板文案 "Web Agent" |
| P1 | CHANGELOG | 无变更日志 |
| P2 | CI/CD | 无 GitHub Actions |
| P2 | 自动更新 | 未配置 electron-updater |
| P2 | 数据导出/备份 | todos/ongoing 等无导出功能 |
| P2 | 跨平台 | 仅 win-x64 |
| P3 | 快捷笔记模块 | 阶段0 计划中未选 |
| P3 | 多语言 i18n | 当前仅中文 |

---

## 四、阻塞问题与技术债务

### 4.1 当前阻塞项

| # | 问题 | 影响 | 缓解措施 |
|---|------|------|----------|
| ~~1~~ | ~~无 CodeBuddy API Key~~ | ~~已解决~~ | ✅ CLI 登录成功，check-login 返回 true |
| 2 | **沙箱下 electron-builder 跑不通** | 无法在沙箱内自动打包 | 已用三段式手动打包绕过；非沙箱环境可恢复标准流程。**用户暂缓处理** |

### 4.2 技术债务

| 级别 | 债务 | 说明 |
|------|------|------|
| 中 | 无自动化测试 | 仅 2 个手动 cjs 脚本；回归靠人肉 |
| 中 | 无 lint/format | 代码风格靠自觉 |
| 中 | README 落后 | 仍是模板文案 |
| 低 | 前端 Provider 切换 UI 缺失 | 后端 API 就绪，SettingsPage 未加控件 |
| 低 | 环境变量配置仅进程级 | save-env-config 提示"重启需重新设置" |
| 低 | 硬编码 UA | news.ts 的 BROWSER_UA 写死 Chrome 126 |
| 低 | 无错误监控 | 生产环境出错只能看 stdout |
| 低 | 打包产物过期 | 当前 zip 不含 Provider 层代码 |

### 4.3 已解决的关键坑（留档备忘）

- ✅ Windows ESM import 需 pathToFileURL
- ✅ startServer(0) 不能用 || 短路
- ✅ 沙箱注入 ELECTRON_RUN_AS_NODE=1 会让 Electron 退化为纯 Node
- ✅ better-sqlite3 打包 Electron 必须 electron-rebuild
- ✅ better-sqlite3 Node 版本升级后需 npm rebuild（NODE_MODULE_VERSION 125→127）
- ✅ CodeBuddy CLI 登录在沙箱内可完成（非交互式 login 命令直接授权）

---

## 五、后续开发计划（建议）

### 阶段5（M5）- 工程化加固（优先）
1. **前端 Provider 切换 UI**：SettingsPage 增加下拉选择，调 /api/providers/switch
2. **重新打包**：含 Provider 层代码，更新 zip 产物
3. **ESLint + Prettier + Husky**：统一代码风格
4. **Vitest**：为 db.ts、routes、providers 补单元测试
5. **更新 README + CHANGELOG**

### 阶段6 - 功能完善
1. Agnes/火山 GLM 联调：用户填 Key 后验证端到端
2. 数据导出：todos/ongoing/countdowns 支持 JSON 导出/导入
3. electron-updater 自动更新
4. 快捷笔记模块：按 registry 机制新增第 7 个模块

### 阶段7 - 扩展
1. 跨平台：macOS arm64 + Linux
2. 多语言 i18n
3. 错误上报

---

## 六、模块状态总表

| 模块 | 状态 | 完成度 | 备注 |
|------|------|--------|------|
| 后端服务（Express+SQLite+Provider） | ✅ 完成 | 100% | 6 路由 + Provider 层 + 流式 chat + 静态托管 |
| 前端工作台（Dashboard+6模块） | ✅ 完成 | 100% | 全部上线，可见性轮询 |
| 聊天页（ChatPage） | ✅ 完成 | 95% | CodeBuddy 已联调；Agnes/火山待填 Key |
| 多 LLM Provider 架构 | ✅ 完成 | 95% | 三 Provider 代码就绪，前端切换 UI 待补 |
| 设置页（SettingsPage） | ✅ 完成 | 90% | 基础功能完成，Provider 切换控件待加 |
| Electron 桌面封装 | ✅ 完成 | 100% | M3 验收 9/9 |
| 便携式打包发布 | ✅ 完成 | 90% | M4 验收 5/5；产物需更新含 Provider 层 |
| 单元/集成测试 | ⏳ 待开始 | 0% | 仅 2 个手动脚本 |
| Lint/Format 配置 | ⏳ 待开始 | 0% | 无 eslint/prettier |
| CI/CD | ⏳ 待开始 | 0% | 全手动构建 |
| 自动更新 | ⏳ 待开始 | 0% | 无 electron-updater |
| README/CHANGELOG | ⏳ 待开始 | 10% | README 落后，无 CHANGELOG |

**总体：核心 MVP ~95% 完成，聊天页已解锁，三 Provider 架构上线。剩余以工程化加固和 UI 补全为主。**
