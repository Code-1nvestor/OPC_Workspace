/**
 * OPC Workbench - Electron preload
 * 最小化 contextBridge，仅暴露平台和版本信息
 */

import { contextBridge, ipcRenderer } from 'electron';
import * as os from 'os';

contextBridge.exposeInMainWorld('opc', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  electron: true,
  homedir: os.homedir(),
});

export {};
