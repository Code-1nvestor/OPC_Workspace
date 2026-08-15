/**
 * 备份/恢复路由集成测试
 * 使用 :memory: SQLite；验证 export / import(merge|replace)
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';


import * as db from '../db.js';
import backupRouter from '../routes/backup.js';

const app = express();
app.use(express.json());
app.use('/api/backup', backupRouter);

function makeBackup() {
  const now = new Date().toISOString();
  return {
    version: 1,
    exportedAt: now,
    app: 'opc-workbench',
    todos: [{ id: 't1', title: '备份待办', note: null, done: 0, created_at: now, updated_at: now }],
    ongoing: [{ id: 'o1', title: '备份进行中', description: 'desc', progress: 50, status: 'active', created_at: now, updated_at: now }],
    countdowns: [{ id: 'c1', title: '备份倒计时', target_date: '2030-01-01', color: null, created_at: now }],
    links: [{ id: 'l1', title: '备份链接', url: 'https://example.com', icon: null, sort_order: 0, created_at: now }],
    focus: [{ id: 'f1', duration_min: 25, completed_at: now }],
  };
}

describe('Backup: GET /api/backup/export', () => {
  it('空库导出返回空数组 + 元信息', async () => {
    const res = await request(app).get('/api/backup/export');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.app).toBe('opc-workbench');
    expect(Array.isArray(res.body.todos)).toBe(true);
    expect(res.body.todos).toHaveLength(0);
  });

  it('有数据时导出包含全部业务表', async () => {
    db.createTodo({ id: 'x1', title: 'test', note: null, done: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    const res = await request(app).get('/api/backup/export');
    expect(res.body.todos.length).toBe(1);
  });
});

describe('Backup: POST /api/backup/import', () => {
  it('缺少 backup 返回 400', async () => {
    const res = await request(app).post('/api/backup/import').send({});
    expect(res.status).toBe(400);
  });

  it('非法 mode 返回 400', async () => {
    const res = await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('merge 模式导入全部业务表', async () => {
    const res = await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'merge' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.todos).toBe(1);
    expect(res.body.stats.ongoing).toBe(1);
    expect(res.body.stats.countdowns).toBe(1);
    expect(res.body.stats.links).toBe(1);
    expect(res.body.stats.focus).toBe(1);
  });

  it('merge 模式重复导入不产生重复数据', async () => {
    await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'merge' });
    const res = await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'merge' });
    expect(res.body.stats.todos).toBe(0); // 已存在，跳过
  });

  it('replace 模式先清空再重建', async () => {
    // 先制造旧数据
    db.createTodo({ id: 'old1', title: '旧数据', note: null, done: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

    const res = await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'replace' });
    expect(res.status).toBe(200);
    expect(res.body.stats.todos).toBe(1);

    const exported = await request(app).get('/api/backup/export');
    // 旧数据被清掉，只剩备份里的 t1
    expect(exported.body.todos.map((t: Record<string, unknown>) => t.id)).toEqual(['t1']);
  });

  it('replace 模式保留聊天会话数据', async () => {
    const now = new Date().toISOString();
    db.createSession({ id: 'sess1', title: '保留会话', model: 'm', sdk_session_id: null, created_at: now, updated_at: now });

    await request(app).post('/api/backup/import').send({ backup: makeBackup(), mode: 'replace' });

    expect(db.getSession('sess1')).toBeDefined();
  });
});
