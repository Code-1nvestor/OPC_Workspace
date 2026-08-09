import { Router } from 'express';
import * as db from '../db.js';

const router = Router();

// 硬编码浏览器 UA（AIHOT 对非浏览器 UA 返回 403）
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 缓存 TTL：10 分钟
const CACHE_TTL_MS = 10 * 60 * 1000;

// 上游 API 基地址
const AIHOT_BASE = 'https://aihot.virxact.com/api/public/items';

interface AIHOTItem {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  summary?: string;
  description?: string;
  excerpt?: string;
  content?: string;
  sourceUrl?: string;
  url?: string;
  link?: string;
  source?: string;
  publishedAt?: string;
  createdAt?: string;
  published_at?: string;
  category?: string;
  slug?: string;
  tags?: string[];
}

/**
 * 归一化 AIHOT 返回的数据为统一格式
 */
function normalizeItems(raw: any[], fallbackCategory: string) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: AIHOTItem, idx: number) => {
    const sourceUrl =
      item.sourceUrl || item.url || item.link || item.source || '';
    return {
      id: String(item.id || item._id || idx),
      title: item.title || item.name || '无标题',
      summary:
        item.summary ||
        item.description ||
        item.excerpt ||
        (item.content ? String(item.content).slice(0, 200) : ''),
      sourceUrl,
      publishedAt:
        item.publishedAt ||
        item.published_at ||
        item.createdAt ||
        new Date().toISOString(),
      category: item.category || item.slug || fallbackCategory,
    };
  });
}

/**
 * 从上游 AIHOT 获取资讯
 */
async function fetchFromAIHOT(category: string, sinceHours: number): Promise<any[]> {
  const params = new URLSearchParams({
    mode: 'selected',
    take: '50',
  });

  // 添加分类过滤
  if (category && category !== 'all') {
    params.set('category', category);
  }

  // since 参数：小时 -> ISO 日期（上限 7 天）
  const sinceDate = new Date(Date.now() - Math.min(sinceHours, 168) * 60 * 60 * 1000);
  params.set('since', sinceDate.toISOString());

  const url = `${AIHOT_BASE}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`AIHOT API returned ${resp.status}`);
    }

    const data = await resp.json();

    // AIHOT 返回格式兼容：{ data: [...] } 或 { items: [...] } 或 [...]
    const items = data.data || data.items || data || [];
    return normalizeItems(items, category);
  } finally {
    clearTimeout(timeout);
  }
}

// GET /api/news?category=<slug>&since=<hours>
router.get('/', async (req, res) => {
  try {
    const category = String(req.query.category || 'all');
    const sinceHours = Math.min(parseInt(String(req.query.since || '24'), 10) || 24, 168);

    const cacheKey = `${category}:${sinceHours}`;
    const cached = db.getNewsCache(cacheKey);
    const now = Date.now();

    // 缓存命中且未过期
    if (cached && now - cached.fetched_at < CACHE_TTL_MS) {
      const payload = JSON.parse(cached.payload);
      return res.json({ ...payload, cached: true, stale: false });
    }

    // 缓存未命中或已过期 -> 请求上游
    try {
      const items = await fetchFromAIHOT(category, sinceHours);
      const payload = { items, count: items.length, category, sinceHours };
      db.setNewsCache(cacheKey, JSON.stringify(payload));
      return res.json({ ...payload, cached: false, stale: false });
    } catch (fetchError: any) {
      // 上游失败 -> 降级返回过期缓存
      if (cached) {
        const payload = JSON.parse(cached.payload);
        console.error('[News] upstream failed, serving stale cache:', fetchError?.message);
        return res.json({ ...payload, cached: true, stale: true });
      }
      // 无缓存可用
      console.error('[News] upstream failed, no cache available:', fetchError?.message);
      return res.status(502).json({
        error: '获取资讯失败，请稍后重试',
        detail: fetchError?.message,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || '获取资讯失败' });
  }
});

export default router;
