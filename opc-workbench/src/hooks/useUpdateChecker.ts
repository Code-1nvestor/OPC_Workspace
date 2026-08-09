/**
 * 自动更新检查 hook
 *
 * 监听 electron-updater 推送的更新状态，
 * 通过 Notification 通知用户。
 */

import { useState, useEffect, useCallback } from 'react';
import { MessagePlugin } from 'tdesign-react';

export type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'up-to-date' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded' }
  | { status: 'error'; message: string };

export function useUpdateChecker() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });

  useEffect(() => {
    // 仅在 Electron 环境下生效
    const opc = (window as any).opc;
    if (!opc?.electron || !opc?.update?.onStatus) return;

    const removeListener = opc.update.onStatus((data: any) => {
      setUpdateStatus(data);

      switch (data.status) {
        case 'available':
          MessagePlugin.info(`发现新版本 v${data.version}，可在设置中下载更新`);
          break;
        case 'downloaded':
          MessagePlugin.success('更新已下载，点击"安装并重启"以应用更新');
          break;
        case 'error':
          MessagePlugin.warning(`更新检查失败: ${data.message}`);
          break;
      }
    });

    return () => {
      if (typeof removeListener === 'function') removeListener();
    };
  }, []);

  const checkForUpdate = useCallback(() => {
    const opc = (window as any).opc;
    if (opc?.update?.check) {
      opc.update.check();
    }
  }, []);

  const downloadUpdate = useCallback(() => {
    const opc = (window as any).opc;
    if (opc?.update?.download) {
      opc.update.download();
    }
  }, []);

  const installUpdate = useCallback(() => {
    const opc = (window as any).opc;
    if (opc?.update?.install) {
      opc.update.install();
    }
  }, []);

  return { updateStatus, checkForUpdate, downloadUpdate, installUpdate };
}
