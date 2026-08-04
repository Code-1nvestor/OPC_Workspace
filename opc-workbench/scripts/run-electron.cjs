/**
 * Electron 启动器
 *
 * 为什么需要它：
 * 某些宿主环境（如 IDE 内置终端）会注入 ELECTRON_RUN_AS_NODE=1 和自定义 NODE_OPTIONS。
 * 前者会让 Electron 退化成纯 Node 运行，require('electron') 拿不到 app/BrowserWindow API；
 * 后者可能注入与 Electron 不兼容的 --require 钩子。
 * cross-env 只能"设置"变量、无法"删除"，所以用这个脚本清理后再拉起 Electron。
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const electronBin = require(path.join(root, 'node_modules', 'electron'));

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.NODE_OPTIONS;

const args = process.argv.slice(2);
const devIndex = args.indexOf('--dev');
if (devIndex !== -1) {
  args.splice(devIndex, 1);
  env.VITE_DEV_SERVER_URL = env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  console.log('[run-electron] 开发模式 ->', env.VITE_DEV_SERVER_URL);
}

const child = spawn(electronBin, ['.', ...args], {
  cwd: root,
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code === null ? 1 : code));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    try { child.kill(sig); } catch {}
  });
}