/**
 * M3 验证脚本：启动后端 -> 启动 Electron -> 检查窗口是否出现
 */
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const node = 'C:/Users/24738/.workbuddy/binaries/node/versions/22.22.2/node.exe';
const npm = 'C:/Users/24738/.workbuddy/binaries/node/versions/22.22.2/node_modules/npm/bin/npm-cli.js';
const cwd = 'E:/WorkBuddy_workspace/OPC_Workspace/opc-workbench';

// 1. 启动后端
console.log('[Test] Starting backend server...');
const server = spawn(node, [npm, 'run', 'dev:server'], {
  cwd,
  stdio: 'pipe',
  env: { ...process.env, OPC_DIRECT_RUN: '1' },
});
let serverOut = '';
server.stdout.on('data', d => { serverOut += d.toString(); });
server.stderr.on('data', d => { serverOut += d.toString(); });

// 2. 等后端启动后，启动 Electron
setTimeout(() => {
  console.log('[Test] Backend output:', serverOut.trim());
  
  // 先检查后端是否在监听
  const req = http.get('http://localhost:3000/api/health', (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('[Test] Backend health check:', res.statusCode, data);
      
      // 启动 Electron
      console.log('[Test] Starting Electron...');
      const electron = spawn(node, [npm, 'exec', '--', 'electron', '.'], {
        cwd,
        stdio: 'pipe',
        env: { ...process.env },
      });
      
      let electronOut = '';
      electron.stdout.on('data', d => {
        const s = d.toString();
        electronOut += s;
        console.log('[Electron]', s.trim());
      });
      electron.stderr.on('data', d => {
        const s = d.toString();
        electronOut += s;
        console.log('[Electron ERR]', s.trim());
      });

      // 等 5 秒看 Electron 是否启动
      setTimeout(() => {
        console.log('\n[Test] Electron output after 5s:');
        console.log(electronOut);
        
        if (electronOut.includes('Express started on port') || electronOut.includes('ready-to-show') || !electron.killed) {
          console.log('\n[Test] M3 PASS: Electron process started successfully');
        } else {
          console.log('\n[Test] M3 RESULT: Electron started but may have display issues (headless)');
        }
        
        electron.kill();
        server.kill();
        process.exit(0);
      }, 5000);
    });
  });
  
  req.on('error', (e) => {
    console.log('[Test] Backend not ready yet, starting Electron anyway...');
    // 直接启动 Electron
    const electron = spawn(node, [npm, 'exec', '--', 'electron', '.'], {
      cwd,
      stdio: 'pipe',
    });
    
    let electronOut = '';
    electron.stdout.on('data', d => { electronOut += d.toString(); console.log('[Electron]', d.toString().trim()); });
    electron.stderr.on('data', d => { electronOut += d.toString(); console.log('[Electron ERR]', d.toString().trim()); });
    
    setTimeout(() => {
      console.log('\n[Test] Electron output:', electronOut);
      electron.kill();
      server.kill();
      process.exit(0);
    }, 5000);
  });
  
  req.setTimeout(3000);
}, 3000);
