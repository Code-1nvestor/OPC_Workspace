/**
 * 数据备份/恢复路由
 *
 * GET  /api/backup/export  - 导出全部业务数据为 JSON（todos/ongoing/countdowns/links/focus）
 * POST /api/backup/import  - 导入备份（mode=merge 合并 | mode=replace 清空后重建）
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllTodos, createTodo, getTodoById,
  getAllOngoing, createOngoing, getOngoingById,
  getAllCountdowns, createCountdown, getCountdownById,
  getAllLinks, createLink, getLinkById,
  getAllFocusSessions, createFocusSession, getFocusById,
  clearBusinessData,
} from '../db.js';

const router = Router();

// ============= 导出 =============

router.get('/export', (_req, res) => {
  try {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'opc-workbench',
      todos: getAllTodos(),
      ongoing: getAllOngoing(),
      countdowns: getAllCountdowns(),
      links: getAllLinks(),
      focus: getAllFocusSessions(),
    };
    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '导出失败' });
  }
});

// ============= 导入 =============

router.post('/import', (req, res) => {
  try {
    const { backup, mode = 'merge' } = req.body || {};
    if (!backup || typeof backup !== 'object') {
      return res.status(400).json({ error: '缺少 backup 数据' });
    }
    if (mode !== 'merge' && mode !== 'replace') {
      return res.status(400).json({ error: 'mode 仅支持 merge 或 replace' });
    }

    const stats = { todos: 0, ongoing: 0, countdowns: 0, links: 0, focus: 0 };

    if (mode === 'replace') {
      // 清空业务表（不删 sessions/messages，聊天记录独立保留）
      clearBusinessData();
    }

    // 待办
    if (Array.isArray(backup.todos)) {
      for (const t of backup.todos) {
        if (!t?.title) continue;
        const exists = mode === 'merge' && getTodoById(t.id);
        if (exists) continue;
        createTodo({
          id: t.id || uuidv4(),
          title: String(t.title),
          note: t.note ?? null,
          done: t.done ? 1 : 0,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        });
        stats.todos++;
      }
    }

    // 进行中
    if (Array.isArray(backup.ongoing)) {
      for (const o of backup.ongoing) {
        if (!o?.title) continue;
        const exists = mode === 'merge' && getOngoingById(o.id);
        if (exists) continue;
        createOngoing({
          id: o.id || uuidv4(),
          title: String(o.title),
          description: o.description ?? null,
          progress: Math.max(0, Math.min(100, Number(o.progress) || 0)),
          status: o.status || 'active',
          created_at: o.created_at || new Date().toISOString(),
          updated_at: o.updated_at || new Date().toISOString(),
        });
        stats.ongoing++;
      }
    }

    // 倒计时
    if (Array.isArray(backup.countdowns)) {
      for (const c of backup.countdowns) {
        if (!c?.title || !c?.target_date) continue;
        const exists = mode === 'merge' && getCountdownById(c.id);
        if (exists) continue;
        createCountdown({
          id: c.id || uuidv4(),
          title: String(c.title),
          target_date: String(c.target_date),
          color: c.color ?? null,
          created_at: c.created_at || new Date().toISOString(),
        });
        stats.countdowns++;
      }
    }

    // 链接
    if (Array.isArray(backup.links)) {
      for (const l of backup.links) {
        if (!l?.title || !l?.url) continue;
        const exists = mode === 'merge' && getLinkById(l.id);
        if (exists) continue;
        createLink({
          id: l.id || uuidv4(),
          title: String(l.title),
          url: String(l.url),
          icon: l.icon ?? null,
          sort_order: Number(l.sort_order) || 0,
          created_at: l.created_at || new Date().toISOString(),
        });
        stats.links++;
      }
    }

    // 番茄钟
    if (Array.isArray(backup.focus)) {
      for (const f of backup.focus) {
        if (!f?.completed_at) continue;
        const exists = mode === 'merge' && getFocusById(f.id);
        if (exists) continue;
        createFocusSession({
          id: f.id || uuidv4(),
          duration_min: Math.max(1, Math.min(120, Number(f.duration_min) || 25)),
          completed_at: String(f.completed_at),
        });
        stats.focus++;
      }
    }

    res.json({ success: true, mode, stats, message: `导入完成：待办 ${stats.todos}、进行中 ${stats.ongoing}、倒计时 ${stats.countdowns}、链接 ${stats.links}、番茄钟 ${stats.focus}` });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '导入失败' });
  }
});

export default router;
