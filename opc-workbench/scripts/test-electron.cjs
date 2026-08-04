/**
 * M3 验收脚本：启动 Electron -> 抓日志 -> 优雅退出 -> 检查残留进程
 * 关键：必须清掉 ELECTRON_RUN_AS_NODE / NODE_OPTIONS，否则 require('electron') 拿不到 API
 */
const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const electronBin = require(path.join(root, 'node_modules', 'electron'));

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.NODE_OPTIONS;
// 渲染进程加载完成 3s 后走真实退出路径（等价于托盘「退出」）
env.OPC_TEST_AUTOQUIT = '3000';

console.log('[test] electron bin =', electronBin);

// 测试环境无 GPU，禁用硬件加速避免 GPU 进程反复崩溃
const child = spawn(electronBin, ['.', '--disable-gpu', '--disable-software-rasterizer', '--no-sandbox'], {
  cwd: root,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
child.stdout.on('data', (d) => {
  out += d.toString();
  process.stdout.write('[out] ' + d.toString());
});
child.stderr.on('data', (d) => {
  out += d.toString();
  process.stdout.write('[err] ' + d.toString());
});

function report(exitCode) {
  console.log('\n[test] ---- 检查残留进程 ----');
  let residual = '';
  try {
    residual = execSync('tasklist /FI "IMAGENAME eq electron.exe" /NH', {
      encoding: 'utf8',
    }).trim();
  } catch (e) {
    residual = '(tasklist failed: ' + e.message + ')';
  }
  const hasResidual = /electron\.exe/i.test(residual);
  console.log(residual);

  console.log('\n[test] ---- 结果判定 ----');
  const okPort = /Express started on port (\d+)/.exec(out);
  const dynamicPort = okPort && okPort[1] !== '3000' && okPort[1] !== '0';
  const results = [
    ['内嵌 Express 启动 ', !!okPort, okPort ? 'port ' + okPort[1] : ''],
    ['动态端口(非 3000)', !!dynamicPort, okPort ? okPort[1] : ''],
    ['API server 日志   ', /API server started/.test(out), ''],
    ['渲染进程加载成功  ', /Renderer loaded OK/.test(out), ''],
    ['走 before-quit 清理', /Shutting down backend/.test(out), ''],
    ['SQLite 已关闭     ', /SQLite closed/.test(out), ''],
    ['进程正常退出(0)   ', exitCode === 0, 'code=' + exitCode],
    ['退出零残留        ', !hasResidual, ''],
    ['无致命错误        ', !/TypeError|Cannot find module|ERR_MODULE|ERR_DLOPEN/.test(out), ''],
  ];
  let pass = 0;
  for (const [name, ok, extra] of results) {
    console.log(`${name}: ${ok ? 'PASS' : 'FAIL'}${extra ? ' (' + extra + ')' : ''}`);
    if (ok) pass++;
  }
  console.log(`\n[test] ${pass}/${results.length} 通过`);
  process.exit(pass === results.length ? 0 : 1);
}

let reported = false;
child.on('exit', (code) => {
  console.log('\n[test] electron exited with code', code);
  if (!reported) {
    reported = true;
    setTimeout(() => report(code), 2000);
  }
});

// 兜底超时
setTimeout(() => {
  if (!reported) {
    reported = true;
    console.log('\n[test] !! 超时未退出，强杀');
    try { child.kill('SIGKILL'); } catch {}
    setTimeout(() => report(-1), 2000);
  }
}, 30000);
