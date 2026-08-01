import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

const router = Router();

// GET /api/ongoing
router.get('/', (req, res) => {
  try {
    res.json({ items: db.getAllOngoing() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '获取进行中事项失败' });
  }
});

// POST /api/ongoing
router.post('/', (req, res) => {
  try {
    const { title, description, progress, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });
    const now = new Date().toISOString();
    const item = db.createOngoing({
      id: uuidv4(),
      title: title.trim(),
      description: description || null,
      progress: Math.max(0, Math.min(100, progress || 0)),
      status: status || 'active',
      created_at: now,
      updated_at: now,
    });
    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '创建进行中事项失败' });
  }
});

// PATCH /api/ongoing/:id
router.patch('/:id', (req, res) => {
  try {
    const success = db.updateOngoing(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: '事项不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '更新进行中事项失败' });
  }
});

// DELETE /api/ongoing/:id
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteOngoing(req.params.id);
    if (!success) return res.status(404).json({ error: '事项不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '删除进行中事项失败' });
  }
});

export default router;
