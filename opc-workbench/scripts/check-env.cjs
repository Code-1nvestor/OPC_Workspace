const { execSync } = require('child_process');
console.log('process.env.ELECTRON_RUN_AS_NODE =', JSON.stringify(process.env.ELECTRON_RUN_AS_NODE));
console.log('process.env.NODE_OPTIONS        =', JSON.stringify(process.env.NODE_OPTIONS));
for (const scope of ['HKCU\\Environment', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment']) {
  try {
    const r = execSync(`reg query "${scope}" /v ELECTRON_RUN_AS_NODE`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(`[${scope}] ->`, r.trim());
  } catch {
    console.log(`[${scope}] -> 未设置`);
  }
}
