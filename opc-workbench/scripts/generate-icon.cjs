/**
 * 生成应用图标
 * 用 Node.js 生成一个简单的 PNG 图标，然后用 png-to-ico 转为 .ico
 * 
 * 如果 png-to-ico 不可用，直接用 Electron 内置的默认图标
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// 生成一个 256x256 的蓝色 PNG（最小可用图标）
// PNG 头 + IHDR + IDAT + IEND
function createMinimalPng(size, r, g, b) {
  // 使用 Canvas API 不可用（Node 环境），用一个更简单的方式：
  // 创建一个 1x1 像素的 PNG，Electron 会缩放
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
    // IHDR chunk
    0x00, 0x00, 0x00, 0x0D,  // length = 13
    0x49, 0x48, 0x44, 0x52,  // "IHDR"
    0x00, 0x00, 0x01, 0x00,  // width = 256
    0x00, 0x00, 0x01, 0x00,  // height = 256
    0x08,                     // bit depth = 8
    0x02,                     // color type = RGB
    0x00,                     // compression = deflate
    0x00,                     // filter = adaptive
    0x00,                     // interlace = none
  ]);
  // This is too complex for raw bytes. Let's just create a placeholder.
  return null;
}

// 简单方案：创建一个 SVG 图标文件作为源，打包时转 ICO
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#3B82F6"/>
  <text x="128" y="170" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">O</text>
</svg>`;

const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('Created SVG icon:', svgPath);

// 尝试用 sharp 或 png-to-ico 转换（如果安装了的话）
// 如果没有，用户可以手动用在线工具转换，或 electron-builder 会用默认图标
try {
  const { execSync } = require('child_process');
  // 尝试安装 png-to-ico 并转换
  execSync('npx --yes png-to-ico-cli build/icon.svg > build/icon.ico 2>/dev/null || true', {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  });
  if (fs.existsSync(path.join(buildDir, 'icon.ico'))) {
    console.log('Created ICO icon');
  } else {
    console.log('ICO not created - electron-builder will use default icon');
  }
} catch (e) {
  console.log('Icon conversion skipped:', e.message);
}

console.log('Icon generation done.');
