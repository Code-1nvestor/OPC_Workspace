import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

const router = Router();

// GET /api/countdowns
router.get('/', (_req, res) => {
  try {
    res.json({ countdowns: db.getAllCountdowns() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '获取倒计时失败' });
  }
});

// POST /api/countdowns
router.post('/', (req, res) => {
  try {
    const { title, target_date, color } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });
    if (!target_date) return res.status(400).json({ error: '目标日期不能为空' });
    const item = db.createCountdown({
      id: uuidv4(),
      title: title.trim(),
      target_date,
      color: color || null,
      created_at: new Date().toISOString(),
    });
    res.json({ countdown: item });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '创建倒计时失败' });
  }
});

// PATCH /api/countdowns/:id
router.patch('/:id', (req, res) => {
  try {
    const success = db.updateCountdown(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: '倒计时不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '更新倒计时失败' });
  }
});

// DELETE /api/countdowns/:id
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteCountdown(req.params.id);
    if (!success) return res.status(404).json({ error: '倒计时不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '删除倒计时失败' });
  }
});

export default router;
