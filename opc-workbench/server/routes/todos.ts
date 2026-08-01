import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

const router = Router();

// GET /api/todos
router.get('/', (req, res) => {
  try {
    res.json({ todos: db.getAllTodos() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '获取待办失败' });
  }
});

// POST /api/todos
router.post('/', (req, res) => {
  try {
    const { title, note } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });
    const now = new Date().toISOString();
    const todo = db.createTodo({
      id: uuidv4(),
      title: title.trim(),
      note: note || null,
      done: 0,
      created_at: now,
      updated_at: now,
    });
    res.json({ todo });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '创建待办失败' });
  }
});

// PATCH /api/todos/:id
router.patch('/:id', (req, res) => {
  try {
    const success = db.updateTodo(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: '待办不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '更新待办失败' });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteTodo(req.params.id);
    if (!success) return res.status(404).json({ error: '待办不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '删除待办失败' });
  }
});

export default router;
