const fs = require('fs');
const path = require('path');

const log = [];
function out(msg) { log.push(msg); }

try {
  const src = 'C:\\Users\\24738\\.workbuddy\\plugins\\marketplaces\\cb_teams_marketplace\\plugins\\codebuddy-chat-web\\skills\\init-cbc-sdk-web\\templates';
  const dst = 'E:\\WorkBuddy_workspace\\OPC_Workspace\\opc-workbench';

  out('Source: ' + src);
  out('Source exists: ' + fs.existsSync(src));
  out('Dest: ' + dst);

  function copyDir(srcDir, dstDir) {
    fs.mkdirSync(dstDir, { recursive: true });
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const dstPath = path.join(dstDir, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, dstPath);
      } else {
        fs.copyFileSync(srcPath, dstPath);
        out('Copied: ' + dstPath);
      }
    }
  }

  copyDir(src, dst);

  // Update package.json name
  const pkgPath = path.join(dst, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = 'opc-workbench';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  out('Updated package.json name to opc-workbench');

  // Write .npmrc
  const npmrcPath = path.join(dst, '.npmrc');
  const npmrcContent = `registry=https://registry.npmmirror.com
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
`;
  fs.writeFileSync(npmrcPath, npmrcContent);
  out('Created .npmrc');

  // Write .env.example
  const envPath = path.join(dst, '.env.example');
  const envContent = `# CodeBuddy API Key (从 https://www.codebuddy.cn 获取)
CODEBUDDY_API_KEY=

# 可选：Auth Token (二选一)
# CODEBUDDY_AUTH_TOKEN=

# 可选：环境设置
# CODEBUDDY_INTERNET_ENVIRONMENT=

# 可选：自定义 Base URL
# CODEBUDDY_BASE_URL=
`;
  fs.writeFileSync(envPath, envContent);
  out('Created .env.example');

  // Write .env (copy of .env.example)
  fs.writeFileSync(path.join(dst, '.env'), envContent);
  out('Created .env');

  // Write .gitignore
  const gitignoreContent = `# Dependencies
node_modules/

# Build output
dist/
dist-server/
dist-electron/
release/

# Data
data/

# Environment
.env

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
npm-debug.log*
`;
  fs.writeFileSync(path.join(dst, '.gitignore'), gitignoreContent);
  out('Created .gitignore');

  out('SUCCESS: All done!');
} catch (err) {
  out('ERROR: ' + err.message);
  out('STACK: ' + err.stack);
}

fs.writeFileSync('E:\\WorkBuddy_workspace\\OPC_Workspace\\_copy-result.txt', log.join('\n'));
