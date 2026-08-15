/**
 * API 路由集成测试（todos + focus）
 * 使用 :memory: SQLite 避免影响生产数据；直接挂载 Router 到临时 express app。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

// 必须在 import db 之后、任何 CRUD 之前设置；本文件独立 worker，db 模块在此进程内是新的

import todosRouter from '../routes/todos.js';
import focusRouter from '../routes/focus.js';

const app = express();
app.use(express.json());
app.use('/api/todos', todosRouter);
app.use('/api/focus', focusRouter);

describe('Routes: /api/todos', () => {
  it('GET / 返回空列表', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('todos');
    expect(Array.isArray(res.body.todos)).toBe(true);
  });

  it('POST / 创建待办并返回 todo', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: '测试待办', note: '备注内容' });
    expect(res.status).toBe(200);
    expect(res.body.todo).toBeDefined();
    expect(res.body.todo.title).toBe('测试待办');
    expect(res.body.todo.note).toBe('备注内容');
  });

  it('POST / 空标题返回 400', async () => {
    const res = await request(app).post('/api/todos').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('PATCH /:id 更新待办完成状态', async () => {
    const created = await request(app).post('/api/todos').send({ title: '完成项' });
    const id = created.body.todo.id;

    const res = await request(app).patch(`/api/todos/${id}`).send({ done: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/todos');
    const updated = list.body.todos.find((t: any) => t.id === id);
    expect(updated.done).toBe(1);
  });

  it('PATCH /:id 不存在的 id 返回 404', async () => {
    const res = await request(app).patch(`/api/todos/${uuidv4()}`).send({ done: 1 });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id 删除待办', async () => {
    const created = await request(app).post('/api/todos').send({ title: '待删除' });
    const id = created.body.todo.id;

    const res = await request(app).delete(`/api/todos/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/todos');
    expect(list.body.todos.find((t: any) => t.id === id)).toBeUndefined();
  });
});

describe('Routes: /api/focus', () => {
  it('GET / 返回统计字段', async () => {
    const res = await request(app).get('/api/focus');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
    expect(res.body).toHaveProperty('todayCount');
    expect(res.body).toHaveProperty('totalMinutes');
  });

  it('POST / 记录番茄钟并 clamp 时长', async () => {
    const res = await request(app).post('/api/focus').send({ duration_min: 999 });
    expect(res.status).toBe(200);
    expect(res.body.session.duration_min).toBe(120); // clamp 到上限
    expect(res.body.todayCount).toBeGreaterThanOrEqual(1);
  });

  it('POST / 默认时长 25 分钟', async () => {
    const res = await request(app).post('/api/focus').send({});
    expect(res.status).toBe(200);
    expect(res.body.session.duration_min).toBe(25);
  });
});

describe('DB 隔离验证', () => {
  beforeAll(() => {
    // 清理内存库中的业务表，保证每个测试文件独立
    db.clearAllData();
  });

  it('测试使用 :memory: 数据库而非生产库', () => {
    expect(process.env.OPC_DB_PATH).toBe(':memory:');
  });
});
