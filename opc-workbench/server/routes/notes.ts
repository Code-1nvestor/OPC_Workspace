/**
 * 快捷笔记路由
 *
 * GET    /api/notes      - 获取全部笔记（置顶优先，最近更新在前）
 * POST   /api/notes      - 创建笔记
 * PATCH  /api/notes/:id  - 更新笔记（title/content/color/pinned）
 * DELETE /api/notes/:id  - 删除笔记
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAllNotes, createNote, updateNote, deleteNote } from '../db.js';

const router = Router();

// GET /api/notes
router.get('/', (_req, res) => {
  try {
    res.json({ notes: getAllNotes() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '获取笔记失败' });
  }
});

// POST /api/notes
router.post('/', (req, res) => {
  try {
    const { title, content, color } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '标题不能为空' });
    const now = new Date().toISOString();
    const note = createNote({
      id: uuidv4(),
      title: title.trim(),
      content: content || null,
      color: color || null,
      pinned: 0,
      created_at: now,
      updated_at: now,
    });
    res.json({ note });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '创建笔记失败' });
  }
});

// PATCH /api/notes/:id
router.patch('/:id', (req, res) => {
  try {
    const success = updateNote(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: '笔记不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '更新笔记失败' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  try {
    const success = deleteNote(req.params.id);
    if (!success) return res.status(404).json({ error: '笔记不存在' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '删除笔记失败' });
  }
});

export default router;
