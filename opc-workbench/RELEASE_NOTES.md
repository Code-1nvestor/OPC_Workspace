# OPC Workbench v1.1.2 Release Notes

> 一人公司工作台 — 本地 AI 助手桌面应用（Electron + React + TypeScript）

## 核心功能

- 💬 **AI 聊天**：流式对话、工具调用可视化、多会话管理、权限控制
- 🔌 **多 LLM Provider**：CodeBuddy / 火山 GLM-5.2（Anthropic）/ Agnes（OpenAI 兼容）三通道可切换，热重载 + .env 持久化
- 📊 **工作台**：待办事项、进行中事项、AI 资讯、倒计时、常用链接、番茄钟 6 大模块
- 🤖 **自定义 Agent**：创建/管理多个 Agent 配置
- 🎨 **主题切换**：深色/浅色
- 🖥️ **桌面封装**：托盘常驻、单实例锁、关闭隐藏、退出零残留

## 本次版本（1.1.2）变更

### 打包修复
- electron-builder 配置修复：`AppImage` → `appImage`（修复 schema 校验失败）
- `signAndEditExecutable: false`：跳过 winCodeSign，规避 Windows 符号链接权限问题
- 合规 256×256 图标生成
- 打包脚本版本号动态化（不再硬编码 1.0.0）

### 上线加固（1.1.1 起累计）
- Express 全局错误处理中间件 + 404 兜底
- Rate Limiting（每分钟 120 次，跳过 SSE 长连接）
- TypeScript 全量类型检查（src + server + electron）
- 单元测试覆盖 db CRUD + Provider 层
- README / CHANGELOG 全面完善

## 安装方式

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows x64 | `OPC-Workbench-1.1.2-portable.exe` | 便携版，免安装直接运行 |
| Windows x64 | `OPC-Workbench-1.1.2-win-x64.zip` | 完整分发包（含 Electron 运行时） |

## 环境要求

- Windows x64 / macOS（x64+arm64）/ Linux x64
- 使用 AI 聊天需配置至少一个 LLM Provider 的 API Key（CodeBuddy / 火山 CodingPlan / Agnes）

## 已知说明

- 自动更新依赖 GitHub Releases 发布（本版本为首次发布）
- 便携版（portable）不支持自动更新；自动更新需 NSIS 安装版
