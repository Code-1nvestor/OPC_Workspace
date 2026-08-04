/**
 * 验证最终打包目录的 OPC Workbench.exe 能启动 + 退出零残留
 */
const { spawn, execSync } = require('child_process');
const path = require('path');

const electronBin = path.join(__dirname, '..', 'release-packaged', 'OPC Workbench.exe');

if (!require('fs').existsSync(electronBin)) {
  console.error('exe not found:', electronBin);
  console.error('请先运行: npm run dist:final');
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.NODE_OPTIONS;
env.OPC_TEST_AUTOQUIT = '3000';

console.log('launching:', electronBin);
const c = spawn(electronBin, ['--disable-gpu', '--no-sandbox'], {
  env, stdio: ['ignore', 'pipe', 'pipe'],
});

let out = '';
c.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
c.stderr.on('data', (d) => { out += d; process.stderr.write(d); });

c.on('exit', (code) => {
  console.log('\n\nexit code:', code);
  console.log('\n--- 完整日志 ---');
  console.log(out);

  console.log('\n--- 判定 ---');
  const checks = [
    ['Express started', /Express started on port \d+/],
    ['Renderer load  ', /Renderer loaded OK/],
    ['Shutting down  ', /Shutting down backend/],
    ['SQLite closed  ', /SQLite closed/],
    ['No fatal error ', /TypeError|Cannot find module|ERR_MODULE|ERR_DLOPEN/],
  ];
  let pass = 0;
  for (const [name, re] of checks) {
    const ok = name === 'No fatal error ' ? !re.test(out) : re.test(out);
    console.log(name + ':', ok ? 'PASS' : 'FAIL');
    if (ok) pass++;
  }
  console.log(`\n${pass}/${checks.length}`);

  setTimeout(() => {
    try {
      const r = execSync('tasklist /FI "IMAGENAME eq OPC Workbench.exe" /NH', { encoding: 'utf8' });
      console.log('残余:', r.trim() || '(无)');
    } catch (e) {}
  }, 1500);
});