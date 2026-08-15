/**
 * 快捷笔记路由集成测试
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

process.env.OPC_DB_PATH = ':memory:';

import notesRouter from '../routes/notes.js';

const app = express();
app.use(express.json());
app.use('/api/notes', notesRouter);

describe('Routes: /api/notes', () => {
  it('GET / 初始返回空列表', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(res.body.notes).toEqual([]);
  });

  it('POST / 创建笔记', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: '会议记录', content: '讨论上线方案', color: '#0052d9' });
    expect(res.status).toBe(200);
    expect(res.body.note.title).toBe('会议记录');
    expect(res.body.note.pinned).toBe(0);
  });

  it('POST / 空标题返回 400', async () => {
    const res = await request(app).post('/api/notes').send({ title: '  ' });
    expect(res.status).toBe(400);
  });

  it('PATCH /:id 置顶笔记', async () => {
    const created = await request(app).post('/api/notes').send({ title: '置顶项' });
    const id = created.body.note.id;

    const res = await request(app).patch(`/api/notes/${id}`).send({ pinned: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/notes');
    const updated = list.body.notes.find((n: any) => n.id === id);
    expect(updated.pinned).toBe(1);
  });

  it('PATCH /:id 不存在的 id 返回 404', async () => {
    const res = await request(app).patch('/api/notes/nonexistent').send({ pinned: 1 });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id 删除笔记', async () => {
    const created = await request(app).post('/api/notes').send({ title: '待删除' });
    const id = created.body.note.id;

    const res = await request(app).delete(`/api/notes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const list = await request(app).get('/api/notes');
    expect(list.body.notes.find((n: any) => n.id === id)).toBeUndefined();
  });
});
