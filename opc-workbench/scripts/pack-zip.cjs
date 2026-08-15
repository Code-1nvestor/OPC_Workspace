/**
 * 把 release-packaged 整个目录打成 zip
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'release-packaged');
const tmpCopy = path.join(__dirname, '..', '_zip_tmp');
const pkg = require('../package.json');
const zipOut = path.join(__dirname, '..', `OPC-Workbench-${pkg.version}-win-x64.zip`);

if (!fs.existsSync(src)) {
  console.error('missing release-packaged/, run scripts/assemble-release.cjs first');
  process.exit(1);
}

function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
    const sp = path.join(s, entry.name);
    const dp = path.join(d, entry.name);
    if (entry.isDirectory()) {
      copyDir(sp, dp);
    } else {
      try { fs.copyFileSync(sp, dp); } catch (e) {
        console.log('  skip locked:', sp, e.code);
      }
    }
  }
}

console.log('copying to temp dir...');
const t0 = Date.now();
try { fs.rmSync(tmpCopy, { recursive: true, force: true }); } catch {}
copyDir(src, tmpCopy);
console.log(`copied in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const sevenZip = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
console.log('zipping with 7za...');
try {
  execFileSync(sevenZip, ['a', '-tzip', '-mx=5', '-r', zipOut, tmpCopy + path.sep + '*'], { stdio: 'inherit' });
} catch (e) {
  console.log('7za exited with error, but partial zip may exist');
}

const sz = fs.statSync(zipOut).size / 1024 / 1024;
console.log(`\n✓ ${zipOut} (${sz.toFixed(2)} MB)`);