/**
 * .env 文件读写工具
 *
 * 将环境变量变更持久化到 .env 文件，使 Provider 切换在重启后仍然生效。
 * 支持增量更新：只改指定 key，保留其他行和注释不变。
 */

import * as fs from 'fs';
import * as path from 'path';

/** 获取 .env 文件路径（开发模式用项目根目录，Electron 生产模式用 userData） */
function getEnvFilePath(): string {
  // 优先使用 OPC_ENV_PATH 环境变量（Electron 生产模式可指定）
  if (process.env.OPC_ENV_PATH) {
    return process.env.OPC_ENV_PATH;
  }
  // 开发模式：项目根目录下的 .env
  // __dirname 在 esbuild bundle 后是 dist-server/，向上找一级
  const baseDir = process.cwd();
  return path.join(baseDir, '.env');
}

/** 读取 .env 文件内容，返回 key->value 映射 */
export function readEnvFile(): Record<string, string> {
  const envPath = getEnvFilePath();
  const result: Record<string, string> = {};

  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf-8');
  } catch {
    return result;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }

  return result;
}

/**
 * 增量更新 .env 文件：只改指定的 key，保留原有注释和顺序。
 * 如果 key 不存在，追加到文件末尾。
 */
export function updateEnvFile(updates: Record<string, string | undefined>): void {
  const envPath = getEnvFilePath();

  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf-8');
  } catch {
    // 文件不存在，创建空内容
    content = '';
  }

  const lines = content.split('\n');
  const updatedKeys = new Set<string>();

  // 遍历现有行，替换匹配的 key
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();

    if (key in updates) {
      const newValue = updates[key];
      if (newValue === undefined) {
        // 值为 undefined -> 注释掉该行
        lines[i] = `# ${key}=`;
      } else {
        lines[i] = `${key}=${newValue}`;
      }
      updatedKeys.add(key);
    }
  }

  // 追加不存在的 key
  const newKeys = Object.entries(updates).filter(([k, v]) => !updatedKeys.has(k) && v !== undefined);
  if (newKeys.length > 0) {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    for (const [key, value] of newKeys) {
      lines.push(`${key}=${value}`);
    }
  }

  // 写回文件
  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
}

/** 同步 process.env 与 .env 文件中的值 */
export function syncProcessEnv(updates: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}
