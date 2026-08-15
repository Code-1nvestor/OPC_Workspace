import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库文件路径 - 支持环境变量（Electron 生产模式传入 userData 路径）
const dbPath = process.env.OPC_DB_PATH
  ? process.env.OPC_DB_PATH
  : path.join(__dirname, '..', 'data', 'opc.db');

// 确保 data 目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db: DatabaseType = new Database(dbPath);

// 启用 WAL 模式以提高性能
db.pragma('journal_mode = WAL');

// 关闭数据库连接（供 Electron 退出清理调用）
export function closeDb(): void {
  try {
    db.close();
  } catch {
    // already closed
  }
}

// 初始化数据库表
db.exec(`
  -- 会话表
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    sdk_session_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 消息表
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TEXT NOT NULL,
    tool_calls TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  -- 为会话 ID 创建索引
  CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
`);

// 数据库迁移：添加 sdk_session_id 列（如果不存在）
try {
  const tableInfo = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  const hasColumn = tableInfo.some(col => col.name === 'sdk_session_id');
  if (!hasColumn) {
    db.exec("ALTER TABLE sessions ADD COLUMN sdk_session_id TEXT");
    console.log("[DB] Added sdk_session_id column to sessions table");
  }
} catch {
  // 忽略错误（列可能已存在）
}

// 类型定义
export interface DbSession {
  id: string;
  title: string;
  model: string;
  sdk_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  created_at: string;
  tool_calls: string | null;
}

// ============= 会话操作 =============

// 获取所有会话
export function getAllSessions(): DbSession[] {
  const stmt = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC');
  return stmt.all() as DbSession[];
}

// 获取单个会话
export function getSession(id: string): DbSession | undefined {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(id) as DbSession | undefined;
}

// 创建会话
export function createSession(session: DbSession): DbSession {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, title, model, sdk_session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(session.id, session.title, session.model, session.sdk_session_id, session.created_at, session.updated_at);
  return session;
}

// 更新会话
export function updateSession(id: string, updates: Partial<Pick<DbSession, 'title' | 'model' | 'sdk_session_id'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.model !== undefined) {
    fields.push('model = ?');
    values.push(updates.model);
  }
  if (updates.sdk_session_id !== undefined) {
    fields.push('sdk_session_id = ?');
    values.push(updates.sdk_session_id);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

// 删除会话
export function deleteSession(id: string): boolean {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ============= 消息操作 =============

// 获取会话的所有消息
export function getMessagesBySession(sessionId: string): DbMessage[] {
  const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC');
  return stmt.all(sessionId) as DbMessage[];
}

// 创建消息
export function createMessage(message: DbMessage): DbMessage {
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, role, content, model, created_at, tool_calls)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    message.id,
    message.session_id,
    message.role,
    message.content,
    message.model,
    message.created_at,
    message.tool_calls
  );

  // 更新会话的 updated_at
  const updateStmt = db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?');
  updateStmt.run(new Date().toISOString(), message.session_id);

  return message;
}

// 更新消息内容
export function updateMessage(id: string, updates: Partial<Pick<DbMessage, 'content' | 'tool_calls'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.tool_calls !== undefined) {
    fields.push('tool_calls = ?');
    values.push(updates.tool_calls);
  }

  if (fields.length === 0) return false;

  values.push(id);

  const stmt = db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

// 删除消息
export function deleteMessage(id: string): boolean {
  const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// 批量创建消息（用于保存对话）
export function createMessages(messages: DbMessage[]): void {
  const stmt = db.prepare(`
    INSERT INTO messages (id, session_id, role, content, model, created_at, tool_calls)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((msgs: DbMessage[]) => {
    for (const msg of msgs) {
      stmt.run(msg.id, msg.session_id, msg.role, msg.content, msg.model, msg.created_at, msg.tool_calls);
    }
  });

  insertMany(messages);
}

// 清空所有数据
export function clearAllData(): void {
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM sessions');
}

// ============= OPC 工作台新表 =============

db.exec(`
  -- 待办事项
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 进行中事项
  CREATE TABLE IF NOT EXISTS ongoing_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- 重要日期倒计时
  CREATE TABLE IF NOT EXISTS countdowns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target_date TEXT NOT NULL,
    color TEXT,
    created_at TEXT NOT NULL
  );

  -- 常用链接
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  -- 番茄钟完成记录
  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    duration_min INTEGER NOT NULL DEFAULT 25,
    completed_at TEXT NOT NULL
  );

  -- AI 资讯缓存
  CREATE TABLE IF NOT EXISTS news_cache (
    cache_key TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  );
`);

// ============= Todos CRUD =============

export interface Todo {
  id: string;
  title: string;
  note: string | null;
  done: number;
  created_at: string;
  updated_at: string;
}

export function getAllTodos(): Todo[] {
  return db.prepare('SELECT * FROM todos ORDER BY done ASC, created_at DESC').all() as Todo[];
}

export function createTodo(todo: Todo): Todo {
  db.prepare('INSERT INTO todos (id, title, note, done, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(todo.id, todo.title, todo.note, todo.done, todo.created_at, todo.updated_at);
  return todo;
}

export function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'note' | 'done'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.note !== undefined) { fields.push('note = ?'); values.push(updates.note); }
  if (updates.done !== undefined) { fields.push('done = ?'); values.push(updates.done); }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?'); values.push(new Date().toISOString());
  values.push(id);
  return db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
}

export function deleteTodo(id: string): boolean {
  return db.prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0;
}

// ============= Ongoing Items CRUD =============

export interface OngoingItem {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function getAllOngoing(): OngoingItem[] {
  return db.prepare("SELECT * FROM ongoing_items WHERE status != 'archived' ORDER BY created_at DESC").all() as OngoingItem[];
}

export function createOngoing(item: OngoingItem): OngoingItem {
  db.prepare('INSERT INTO ongoing_items (id, title, description, progress, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(item.id, item.title, item.description, item.progress, item.status, item.created_at, item.updated_at);
  return item;
}

export function updateOngoing(id: string, updates: Partial<Pick<OngoingItem, 'title' | 'description' | 'progress' | 'status'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.progress !== undefined) {
    const p = Math.max(0, Math.min(100, updates.progress));
    fields.push('progress = ?'); values.push(p);
  }
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
  if (fields.length === 0) return false;
  fields.push('updated_at = ?'); values.push(new Date().toISOString());
  values.push(id);
  return db.prepare(`UPDATE ongoing_items SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
}

export function deleteOngoing(id: string): boolean {
  return db.prepare('DELETE FROM ongoing_items WHERE id = ?').run(id).changes > 0;
}

// ============= Countdowns CRUD =============

export interface Countdown {
  id: string;
  title: string;
  target_date: string;
  color: string | null;
  created_at: string;
}

export function getAllCountdowns(): Countdown[] {
  return db.prepare('SELECT * FROM countdowns ORDER BY target_date ASC').all() as Countdown[];
}

export function createCountdown(item: Countdown): Countdown {
  db.prepare('INSERT INTO countdowns (id, title, target_date, color, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(item.id, item.title, item.target_date, item.color, item.created_at);
  return item;
}

export function updateCountdown(id: string, updates: Partial<Pick<Countdown, 'title' | 'target_date' | 'color'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.target_date !== undefined) { fields.push('target_date = ?'); values.push(updates.target_date); }
  if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
  if (fields.length === 0) return false;
  values.push(id);
  return db.prepare(`UPDATE countdowns SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
}

export function deleteCountdown(id: string): boolean {
  return db.prepare('DELETE FROM countdowns WHERE id = ?').run(id).changes > 0;
}

// ============= Links CRUD =============

export interface Link {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export function getAllLinks(): Link[] {
  return db.prepare('SELECT * FROM links ORDER BY sort_order ASC, created_at ASC').all() as Link[];
}

export function createLink(item: Link): Link {
  db.prepare('INSERT INTO links (id, title, url, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(item.id, item.title, item.url, item.icon, item.sort_order, item.created_at);
  return item;
}

export function updateLink(id: string, updates: Partial<Pick<Link, 'title' | 'url' | 'icon' | 'sort_order'>>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.url !== undefined) { fields.push('url = ?'); values.push(updates.url); }
  if (updates.icon !== undefined) { fields.push('icon = ?'); values.push(updates.icon); }
  if (updates.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(updates.sort_order); }
  if (fields.length === 0) return false;
  values.push(id);
  return db.prepare(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`).run(...values).changes > 0;
}

export function deleteLink(id: string): boolean {
  return db.prepare('DELETE FROM links WHERE id = ?').run(id).changes > 0;
}

// ============= Focus Sessions CRUD =============

export interface FocusSession {
  id: string;
  duration_min: number;
  completed_at: string;
}

export function getAllFocusSessions(): FocusSession[] {
  return db.prepare('SELECT * FROM focus_sessions ORDER BY completed_at DESC').all() as FocusSession[];
}

export function getTodayFocusCount(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const stmt = db.prepare('SELECT COUNT(*) as count FROM focus_sessions WHERE completed_at >= ?');
  return (stmt.get(todayStart.toISOString()) as { count: number }).count;
}

export function createFocusSession(item: FocusSession): FocusSession {
  db.prepare('INSERT INTO focus_sessions (id, duration_min, completed_at) VALUES (?, ?, ?)')
    .run(item.id, item.duration_min, item.completed_at);
  return item;
}

// ============= News Cache =============

export interface NewsCacheRow {
  cache_key: string;
  payload: string;
  fetched_at: number;
}

export function getNewsCache(key: string): NewsCacheRow | undefined {
  return db.prepare('SELECT * FROM news_cache WHERE cache_key = ?').get(key) as NewsCacheRow | undefined;
}

export function setNewsCache(key: string, payload: string): void {
  db.prepare('INSERT OR REPLACE INTO news_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)')
    .run(key, payload, Date.now());
}

// ============= 备份/恢复辅助函数 =============

export function getTodoById(id: string): Todo | undefined {
  return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
}

export function getOngoingById(id: string): OngoingItem | undefined {
  return db.prepare('SELECT * FROM ongoing_items WHERE id = ?').get(id) as OngoingItem | undefined;
}

export function getCountdownById(id: string): Countdown | undefined {
  return db.prepare('SELECT * FROM countdowns WHERE id = ?').get(id) as Countdown | undefined;
}

export function getLinkById(id: string): Link | undefined {
  return db.prepare('SELECT * FROM links WHERE id = ?').get(id) as Link | undefined;
}

export function getFocusById(id: string): FocusSession | undefined {
  return db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as FocusSession | undefined;
}

/** 清空全部业务表（备份导入 replace 模式使用；保留 sessions/messages 聊天记录） */
export function clearBusinessData(): void {
  db.exec(`
    DELETE FROM todos;
    DELETE FROM ongoing_items;
    DELETE FROM countdowns;
    DELETE FROM links;
    DELETE FROM focus_sessions;
  `);
}

export default db;
