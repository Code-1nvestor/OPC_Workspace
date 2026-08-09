/**
 * OPC Workbench - Electron 主进程
 * 
 * 核心设计：
 * - Express 内嵌主进程（不 spawn 子进程，退出时无孤儿进程）
 * - 单实例锁
 * - 关闭窗口 -> 隐藏到托盘
 * - 托盘菜单「打开 / 退出」
 * - 退出时：closeAllConnections() -> closeDb() -> tray.destroy() -> app.quit()
 */

import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

// ============= 环境守卫 =============
// ELECTRON_RUN_AS_NODE=1 会让 Electron 退化成纯 Node，此时 app 等 API 全部为 undefined。
// 直接崩在 requestSingleInstanceLock 上很难排查，这里提前给出可读的错误。
if (!app || typeof app.whenReady !== 'function') {
  console.error(
    '[Electron] 致命错误：未获取到 Electron API。\n' +
      '  常见原因：环境变量 ELECTRON_RUN_AS_NODE=1 被设置。\n' +
      '  请改用 `npm run start:electron` / `npm run dev:electron` 启动（scripts/run-electron.cjs 会自动清理该变量）。'
  );
  process.exit(1);
}

// ============= 全局状态 =============
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let expressServer: http.Server | null = null;
let serverModule: any = null;
let isQuitting = false;

// ============= 自动更新（electron-updater） =============

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendToRenderer('update-status', { status: 'available', version: info.version, releaseNotes: info.releaseNotes });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Up to date');
    sendToRenderer('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-status', { status: 'downloading', percent: Math.round(progress.percent) });
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdater] Update downloaded');
    sendToRenderer('update-status', { status: 'downloaded' });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err?.message);
    sendToRenderer('update-status', { status: 'error', message: err?.message || 'Unknown error' });
  });

  // IPC: 手动检查更新
  ipcMain.handle('update:check', () => {
    autoUpdater.checkForUpdates().catch(() => {});
  });

  // IPC: 下载更新
  ipcMain.handle('update:download', () => {
    autoUpdater.downloadUpdate().catch(() => {});
  });

  // IPC: 安装并重启
  ipcMain.handle('update:install', () => {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  });
}

function sendToRenderer(channel: string, data: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ============= 单实例锁 =============
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ============= 启动后端 Express =============
async function startBackend(): Promise<number> {
  // DB 路径 -> Electron userData 目录
  process.env.OPC_DB_PATH = path.join(app.getPath('userData'), 'opc.db');
  process.env.OPC_EMBEDDED = '1';

  // 内嵌启动 Express：import 编译后的 server bundle
  // Windows 路径需要转为 file:// URL 才能被 ESM import 接受
  const serverPath = path.join(__dirname, '..', 'dist-server', 'index.js');
  const serverUrl = pathToFileURL(serverPath).href;
  serverModule = await import(serverUrl);

  // 开发模式：必须用 3000，vite.config.ts 的 /api 代理指向它
  // 生产模式：用 0 让 OS 分配动态端口，避免与用户其它程序冲突
  const wantPort = process.env.VITE_DEV_SERVER_URL ? 3000 : 0;
  const server: http.Server = serverModule.startServer(wantPort);
  expressServer = server;

  // listen 是异步的，需等 listening 事件后才能拿到真实端口
  const port: number = await new Promise((resolve, reject) => {
    if (server.listening) {
      resolve((server.address() as any).port);
      return;
    }
    server.once('listening', () => resolve((server.address() as any).port));
    server.once('error', reject);
  });

  console.log(`[Electron] Express started on port ${port}, DB at ${process.env.OPC_DB_PATH}`);
  return port;
}

// ============= 创建窗口 =============
async function createWindow() {
  let port: number;
  try {
    port = await startBackend();
  } catch (err) {
    console.error('[Electron] Failed to start backend:', err);
    // 即使后端启动失败，也尝试用固定端口
    port = 3000;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // 先隐藏，ready-to-show 时再显示（避免白屏）
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(getIconPath() ? { icon: getIconPath() } : {}),
    title: 'OPC Workbench',
  });

  // 开发模式：加载 Vite dev server；生产模式：加载内嵌 Express
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('[Electron] Window ready-to-show');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Renderer loaded OK');
    // 自动化验收：走真实退出路径（托盘退出 == app.quit()）
    if (process.env.OPC_TEST_AUTOQUIT) {
      const delay = Number(process.env.OPC_TEST_AUTOQUIT) || 3000;
      setTimeout(() => {
        console.log('[Electron] TEST autoquit -> app.quit()');
        isQuitting = true;
        app.quit();
      }, delay);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[Electron] Renderer FAILED to load: ${code} ${desc} ${url}`);
  });

  // 关闭 -> 隐藏到托盘（不退出）
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// ============= 系统托盘 =============
function getIconPath(): string {
  // 依次尝试：开发目录 / asar 内 / resources 目录
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(process.resourcesPath || '', 'build', 'icon.ico'),
    path.join(process.resourcesPath || '', 'icon.ico'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return '';
}

// 兜底托盘图标：16x16 蓝色圆点（内联 base64 PNG，避免文件缺失导致 Tray 构造失败）
const FALLBACK_TRAY_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAaklEQVQ4jWNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMAoGGwAA6ZoB/8s+xQAAAAAASUVORK5CYII=';

function createTray() {
  let icon: Electron.NativeImage;
  const iconPath = getIconPath();
  try {
    icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  } catch {
    icon = nativeImage.createEmpty();
  }
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(FALLBACK_TRAY_ICON);
  }

  tray = new Tray(icon);
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '打开工作台',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));

  tray.setToolTip('OPC Workbench - 一人公司工作台');

  // 点击托盘图标 -> 显示窗口
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ============= 退出清理（关键：零残留） =============
app.on('before-quit', async (e) => {
  // 任何退出路径（托盘退出 / 系统关机 / Cmd+Q）都要放行窗口 close
  isQuitting = true;

  if (expressServer) {
    e.preventDefault();
    console.log('[Electron] Shutting down backend...');

    // 1. 停止接收新连接
    expressServer.close();

    // 2. 强制断开所有活跃连接（SSE 长连接等）
    // Node 18.2+ 支持 closeAllConnections
    const anyServer = expressServer as any;
    if (typeof anyServer.closeAllConnections === 'function') {
      anyServer.closeAllConnections();
    }

    // 3. 关闭 SQLite 数据库（复用已加载的 server bundle，避免二次 import）
    try {
      if (serverModule && typeof serverModule.closeDb === 'function') {
        serverModule.closeDb();
        console.log('[Electron] SQLite closed.');
      }
    } catch (err) {
      console.error('[Electron] Error closing DB:', err);
    }
    serverModule = null;

    // 4. 销毁托盘
    tray?.destroy();
    tray = null;

    expressServer = null;

    // 给一点时间让连接清理完
    setTimeout(() => {
      app.quit();
    }, 200);
  }
});

// ============= 应用生命周期 =============
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAutoUpdater();
  // 启动后延迟 10 秒检查更新（避免影响启动速度）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 10000);
});

// 窗口全部关闭时不退出（常驻托盘）
app.on('window-all-closed', () => {
  // 不做任何事，窗口已隐藏到托盘
});
