const fs = require('fs');
const path = require('path');

const src = path.join('C:', 'Users', '24738', '.workbuddy', 'plugins', 'marketplaces', 'cb_teams_marketplace', 'plugins', 'codebuddy-chat-web', 'skills', 'init-cbc-sdk-web', 'templates');
const dst = path.join('E:', 'WorkBuddy_workspace', 'OPC_Workspace', 'opc-workbench');

const files = [
  'src/components/ChatMessages.tsx',
  'src/components/ToolCallsCollapse.tsx',
  'src/components/InlinePermissionCard.tsx',
  'src/components/NewChatDialog.tsx',
  'src/components/NewChatView.tsx',
  'src/components/PermissionDialog.tsx',
  'src/components/SettingsPage.tsx',
  'src/components/AgentConfigDialog.tsx',
  'src/pages/ChatPage.tsx',
  'src/utils/iconMap.ts',
  'README.md',
  'DEVELOPMENT.md',
];

const results = [];
for (const f of files) {
  try {
    const s = path.join(src, f);
    const d = path.join(dst, f);
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    results.push('OK: ' + f);
  } catch (e) {
    results.push('FAIL: ' + f + ' -> ' + e.message);
  }
}
fs.writeFileSync(path.join(dst, '_copy-ok.txt'), results.join('\n'));
