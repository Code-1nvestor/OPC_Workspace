/**
 * db.ts 单元测试
 * 测试 SQLite 数据层 CRUD 操作
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// 使用临时数据库路径，避免影响生产数据
process.env.OPC_DB_PATH = `:memory:`;

describe('DB: Sessions', () => {
  beforeAll(() => {
    // db 模块在 import 时已初始化连接，内存数据库已就绪
  });

  it('should create and get a session', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const session = db.createSession({
      id, title: 'Test Session', model: 'test-model',
      sdk_session_id: null, created_at: now, updated_at: now,
    });
    expect(session.id).toBe(id);

    const found = db.getSession(id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Test Session');
  });

  it('should update a session', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createSession({ id, title: 'Before', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });

    const ok = db.updateSession(id, { title: 'After' });
    expect(ok).toBe(true);
    expect(db.getSession(id)!.title).toBe('After');
  });

  it('should delete a session', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createSession({ id, title: 'ToDelete', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });
    expect(db.deleteSession(id)).toBe(true);
    expect(db.getSession(id)).toBeUndefined();
  });

  it('should get all sessions ordered by updated_at DESC', () => {
    const id1 = uuidv4();
    const id2 = uuidv4();
    const t1 = '2026-01-01T00:00:00Z';
    const t2 = '2026-01-02T00:00:00Z';
    db.createSession({ id: id1, title: 'Old', model: 'm', sdk_session_id: null, created_at: t1, updated_at: t1 });
    db.createSession({ id: id2, title: 'New', model: 'm', sdk_session_id: null, created_at: t2, updated_at: t2 });
    const all = db.getAllSessions();
    const idx1 = all.findIndex(s => s.id === id1);
    const idx2 = all.findIndex(s => s.id === id2);
    expect(idx2).toBeLessThan(idx1);
  });
});

describe('DB: Messages', () => {
  it('should create and retrieve messages by session', () => {
    const sid = uuidv4();
    const now = new Date().toISOString();
    db.createSession({ id: sid, title: 'MsgTest', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });

    const msgId = uuidv4();
    db.createMessage({
      id: msgId, session_id: sid, role: 'user', content: 'Hello',
      model: null, created_at: now, tool_calls: null,
    });

    const msgs = db.getMessagesBySession(sid);
    expect(msgs.length).toBe(1);
    expect(msgs[0].content).toBe('Hello');
  });

  it('should update message content', () => {
    const sid = uuidv4();
    const now = new Date().toISOString();
    db.createSession({ id: sid, title: 'UpdMsg', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });
    const mid = uuidv4();
    db.createMessage({ id: mid, session_id: sid, role: 'assistant', content: 'draft', model: 'm', created_at: now, tool_calls: null });
    expect(db.updateMessage(mid, { content: 'final' })).toBe(true);
    expect(db.getMessagesBySession(sid)[0].content).toBe('final');
  });

  it('should delete message', () => {
    const sid = uuidv4();
    const now = new Date().toISOString();
    db.createSession({ id: sid, title: 'DelMsg', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });
    const mid = uuidv4();
    db.createMessage({ id: mid, session_id: sid, role: 'user', content: 'temp', model: null, created_at: now, tool_calls: null });
    expect(db.deleteMessage(mid)).toBe(true);
    expect(db.getMessagesBySession(sid).length).toBe(0);
  });
});

describe('DB: Todos', () => {
  it('should CRUD todos', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createTodo({ id, title: 'Buy milk', note: null, done: 0, created_at: now, updated_at: now });
    expect(db.getAllTodos().some(t => t.id === id)).toBe(true);

    db.updateTodo(id, { done: 1 });
    const found = db.getAllTodos().find(t => t.id === id);
    expect(found!.done).toBe(1);

    db.deleteTodo(id);
    expect(db.getAllTodos().some(t => t.id === id)).toBe(false);
  });
});

describe('DB: Ongoing Items', () => {
  it('should CRUD ongoing items', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createOngoing({ id, title: 'Project A', description: 'desc', progress: 50, status: 'active', created_at: now, updated_at: now });

    db.updateOngoing(id, { progress: 80 });
    const items = db.getAllOngoing();
    expect(items.find(i => i.id === id)!.progress).toBe(80);

    db.deleteOngoing(id);
    expect(db.getAllOngoing().some(i => i.id === id)).toBe(false);
  });

  it('should clamp progress to 0-100', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createOngoing({ id, title: 'Clamp', description: null, progress: 0, status: 'active', created_at: now, updated_at: now });
    db.updateOngoing(id, { progress: 150 });
    expect(db.getAllOngoing().find(i => i.id === id)!.progress).toBe(100);
    db.updateOngoing(id, { progress: -20 });
    expect(db.getAllOngoing().find(i => i.id === id)!.progress).toBe(0);
  });
});

describe('DB: Countdowns', () => {
  it('should CRUD countdowns', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createCountdown({ id, title: 'Deadline', target_date: '2026-12-31', color: '#ff0000', created_at: now });
    expect(db.getAllCountdowns().some(c => c.id === id)).toBe(true);
    db.deleteCountdown(id);
    expect(db.getAllCountdowns().some(c => c.id === id)).toBe(false);
  });
});

describe('DB: Links', () => {
  it('should CRUD links', () => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.createLink({ id, title: 'Google', url: 'https://google.com', icon: null, sort_order: 0, created_at: now });
    expect(db.getAllLinks().some(l => l.id === id)).toBe(true);
    db.deleteLink(id);
    expect(db.getAllLinks().some(l => l.id === id)).toBe(false);
  });
});

describe('DB: Focus Sessions', () => {
  it('should create focus session and count today', () => {
    const before = db.getTodayFocusCount();
    db.createFocusSession({ id: uuidv4(), duration_min: 25, completed_at: new Date().toISOString() });
    expect(db.getTodayFocusCount()).toBe(before + 1);
  });
});

describe('DB: News Cache', () => {
  it('should set and get news cache', () => {
    db.setNewsCache('test-key', '{"items":[]}');
    const cached = db.getNewsCache('test-key');
    expect(cached).toBeDefined();
    expect(cached!.payload).toBe('{"items":[]}');
  });
});
