/**
 * 把 server 运行时必需但 esbuild external 的依赖拷贝到 app.asar.unpacked。
 *
 * 背景：沙箱环境 electron-builder 的 unpack 步骤会因 app.asar 被锁失败，
 * 导致 asarUnpack 配置不生效，运行时 require 路径找不到 -> ENOENT。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcNm = path.join(root, 'node_modules');
const dstNm = path.join(root, 'release-packaged', 'resources', 'app.asar.unpacked', 'node_modules');

const externals = [
  'better-sqlite3',
  'express',
  '@tencent-ai',
  'uuid',
];

function needsTree(name) {
  if (name === 'better-sqlite3') return ['better-sqlite3'];
  if (name === 'uuid') return ['uuid'];
  if (name === '@tencent-ai') return ['@tencent-ai/agent-sdk'];
  if (name === 'express') {
    return ['express', 'body-parser', 'cookie', 'cookie-signature', 'debug', 'depd',
            'encodeurl', 'escape-html', 'etag', 'finalhandler', 'fresh', 'http-errors',
            'merge-descriptors', 'methods', 'on-finished', 'parseurl', 'path-to-regexp',
            'proxy-addr', 'qs', 'range-parser', 'safe-buffer', 'send', 'serve-static',
            'setprototypeof', 'statuses', 'type-is', 'utils-merge', 'vary'];
  }
  return [name];
}

const toCopy = new Set();
for (const e of externals) {
  for (const n of needsTree(e)) toCopy.add(n);
}

console.log('copying', toCopy.size, 'packages to app.asar.unpacked/node_modules/');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = path.join(src, entry.name);
    const dp = path.join(dst, entry.name);
    if (['node_modules', 'test', '__tests__', 'tests', 'example', 'examples', 'docs', 'doc'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      copyDir(sp, dp);
    } else {
      if (/\.(js|cjs|mjs|json|node|d\.ts|map)$/.test(entry.name) || entry.name === 'package.json') {
        try { fs.copyFileSync(sp, dp); } catch {}
      }
    }
  }
}

for (const pkg of toCopy) {
  const src = path.join(srcNm, pkg);
  const dst = path.join(dstNm, pkg);
  if (!fs.existsSync(src)) { console.log('  missing:', src); continue; }
  copyDir(src, dst);
  console.log('  copied:', pkg);
}

console.log('\n✓ externals unpacked');
function sizeDir(d) {
  let total = 0;
  if (!fs.existsSync(d)) return 0;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) total += sizeDir(p);
    else total += fs.statSync(p).size;
  }
  return total;
}
console.log(`  asar.unpacked total: ${(sizeDir(dstNm) / 1024 / 1024).toFixed(2)} MB`);