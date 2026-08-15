/**
 * 完整组装 OPC Workbench 发布目录：
 * 1) 以 Electron 自带 dist 为基底（保证所有运行时 DLL 都在）
 * 2) 用 win-unpacked 的 resources/ 覆盖（保证 app.asar 在）
 * 3) 调用 unpack-externals.cjs 把 esbuild external 依赖手动解包到 asar.unpacked
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const electronDist = path.join(__dirname, '..', 'node_modules', 'electron', 'dist');
const pkg = require('../package.json');
const srcWin = path.join(__dirname, '..', `release-${pkg.version}-x64`, 'win-unpacked');
const dst = path.join(__dirname, '..', 'release-packaged');

if (!fs.existsSync(electronDist)) { console.error('no electron dist'); process.exit(1); }

try { fs.rmSync(dst, { recursive: true, force: true }); } catch {}

console.log('copying Electron runtime...');
function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, entry.name);
    const dp = path.join(d, entry.name);
    if (entry.name === 'resources') continue;
    if (entry.isDirectory()) {
      copyDir(sp, dp);
    } else {
      try { fs.copyFileSync(sp, dp); } catch (e) { console.log('  skip:', sp, e.code); }
    }
  }
}
copyDir(electronDist, dst);

const exeSrc = path.join(dst, 'electron.exe');
const exeDst = path.join(dst, 'OPC Workbench.exe');
if (fs.existsSync(exeSrc)) {
  try { fs.renameSync(exeSrc, exeDst); } catch (e) {
    fs.copyFileSync(exeSrc, exeDst);
    fs.unlinkSync(exeSrc);
  }
  console.log('renamed electron.exe -> OPC Workbench.exe');
}

if (fs.existsSync(path.join(srcWin, 'resources'))) {
  copyDir(path.join(srcWin, 'resources'), path.join(dst, 'resources'));
  console.log('overlaid resources/');
}

// 调用解包脚本
console.log('\nrunning unpack-externals...');
execFileSync(process.execPath, [path.join(__dirname, 'unpack-externals.cjs')], { stdio: 'inherit' });

console.log('\n✓ assemble done ->', dst);