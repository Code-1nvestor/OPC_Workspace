import { errMsg } from '../err.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

const router = Router();

// GET /api/links
router.get('/', (_req, res) => {
  try {
    res.json({ links: db.getAllLinks() });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '获取链接失败') });
  }
});

// POST /api/links
router.post('/', (req, res) => {
  try {
    const { title, url, icon, sort_order } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });
    if (!url?.trim()) return res.status(400).json({ error: 'URL 不能为空' });
    const item = db.createLink({
      id: uuidv4(),
      title: title.trim(),
      url: url.trim(),
      icon: icon || null,
      sort_order: sort_order ?? 0,
      created_at: new Date().toISOString(),
    });
    res.json({ link: item });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '创建链接失败') });
  }
});

// PATCH /api/links/:id
router.patch('/:id', (req, res) => {
  try {
    const success = db.updateLink(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: '链接不存在' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '更新链接失败') });
  }
});

// DELETE /api/links/:id
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteLink(req.params.id);
    if (!success) return res.status(404).json({ error: '链接不存在' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '删除链接失败') });
  }
});

export default router;
