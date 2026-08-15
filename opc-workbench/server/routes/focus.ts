import { errMsg } from '../err.js';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db.js';

const router = Router();

// GET /api/focus - 获取完成记录 + 今日统计
router.get('/', (_req, res) => {
  try {
    const sessions = db.getAllFocusSessions();
    const todayCount = db.getTodayFocusCount();
    const total = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_min, 0);
    res.json({ sessions, todayCount, total, totalMinutes });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '获取番茄钟记录失败') });
  }
});

// POST /api/focus - 记录一次完成
router.post('/', (req, res) => {
  try {
    const { duration_min } = req.body;
    const item = db.createFocusSession({
      id: uuidv4(),
      duration_min: Math.max(1, Math.min(120, duration_min || 25)),
      completed_at: new Date().toISOString(),
    });
    res.json({ session: item, todayCount: db.getTodayFocusCount() });
  } catch (error) {
    res.status(500).json({ error: errMsg(error, '记录番茄钟失败') });
  }
});

export default router;
