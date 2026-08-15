/**
 * OPC Workbench - 统一 API 客户端
 * 封装所有 fetch 调用，统一错误处理与类型推断
 */

const BASE_URL = '/api';

async function request<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}

// ============= Todos =============
export interface Todo {
  id: string;
  title: string;
  done: number;
  created_at: string;
  updated_at: string;
}

export interface OngoingItem {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CountdownItem {
  id: string;
  title: string;
  target_date: string;
  color: string | null;
  created_at: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface FocusSessionItem {
  id: string;
  duration_min: number;
  completed_at: string;
}


export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string;
  category: string;
}
export interface NoteItem {
  id: string;
  title: string;
  content: string | null;
  color: string | null;
  pinned: number;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // Todos
  getTodos: () => request<{ todos: Todo[] }>('/todos'),
  createTodo: (title: string) =>
    request<{ todo: Todo }>('/todos', { method: 'POST', body: JSON.stringify({ title }) }),
  updateTodo: (id: string, patch: Partial<Pick<Todo, 'title' | 'done'>>) =>
    request<{ todo: Todo }>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTodo: (id: string) =>
    request<{ success: boolean }>(`/todos/${id}`, { method: 'DELETE' }),

  // Ongoing items
  getOngoing: () => request<{ items: OngoingItem[] }>('/ongoing'),
  createOngoing: (data: { title: string; description?: string; progress?: number }) =>
    request<{ item: OngoingItem }>('/ongoing', { method: 'POST', body: JSON.stringify(data) }),
  updateOngoing: (id: string, patch: { title?: string; description?: string; progress?: number }) =>
    request<{ item: OngoingItem }>(`/ongoing/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteOngoing: (id: string) =>
    request<{ success: boolean }>(`/ongoing/${id}`, { method: 'DELETE' }),

  // Countdowns
  getCountdowns: () => request<{ countdowns: CountdownItem[] }>('/countdowns'),
  createCountdown: (data: { title: string; target_date: string; color?: string }) =>
    request<{ countdown: CountdownItem }>('/countdowns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCountdown: (id: string) =>
    request<{ success: boolean }>(`/countdowns/${id}`, { method: 'DELETE' }),

  // Links
  getLinks: () => request<{ links: LinkItem[] }>('/links'),
  createLink: (data: { title: string; url: string; icon?: string }) =>
    request<{ link: LinkItem }>('/links', { method: 'POST', body: JSON.stringify(data) }),
  deleteLink: (id: string) =>
    request<{ success: boolean }>(`/links/${id}`, { method: 'DELETE' }),

  // Focus sessions
  getFocus: () => request<{ sessions: FocusSessionItem[]; todayCount: number; totalMinutes: number }>('/focus'),
  createFocus: (data: { duration_min: number; task?: string }) =>
    request<{ session: FocusSessionItem }>('/focus', { method: 'POST', body: JSON.stringify(data) }),

  // Notes
  getNotes: () => request<{ notes: NoteItem[] }>('/notes'),
  createNote: (data: { title: string; content?: string; color?: string }) =>
    request<{ note: NoteItem }>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, patch: Partial<{ title: string; content: string; color: string; pinned: number }>) =>
    request<{ success: boolean }>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteNote: (id: string) =>
    request<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),

  // News
  getNews: (params?: { category?: string; since?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.since) qs.set('since', String(params.since));
    const q = qs.toString();
    return request<{ items: NewsItem[]; cached: boolean; source: string }>(`/news${q ? '?' + q : ''}`);
  },

  // Chat login check
  checkLogin: () => request<{
    isLoggedIn: boolean;
    method?: string;
    providerId?: string;
    providerName?: string;
    envConfigured?: boolean;
    error?: string;
    apiKey?: string;
  }>('/check-login'),

  // Provider 管理
  getProviders: () => request<{
    providers: Array<{ id: string; name: string; available: boolean; isCurrent: boolean }>;
    current: string;
  }>('/providers'),
  switchProvider: (provider: string) =>
    request<{ success: boolean; provider: string; providerName?: string; message: string; persisted?: boolean }>('/providers/switch', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  // 重启 server
  restartServer: () =>
    request<{ success: boolean; port: number; message: string }>('/restart-server', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // 设置导入/导出
  exportSettings: () =>
    request<{
      version: number;
      exportedAt: string;
      provider: string;
      providers: {
        codebuddy: { apiKeyConfigured: boolean; internetEnv: string; baseUrl: string };
        anthropic: { apiKeyConfigured: boolean; baseUrl: string; model: string };
        openai: { apiKeyConfigured: boolean; baseUrl: string; model: string };
      };
    }>('/settings/export'),

  importSettings: (data: Record<string, unknown>) =>
    request<{ success: boolean; message: string; persisted: boolean; note: string }>('/settings/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 数据备份/恢复
  exportBackup: () =>
    request<{
      version: number;
      exportedAt: string;
      app: string;
      todos: Todo[];
      ongoing: OngoingItem[];
      countdowns: CountdownItem[];
      links: LinkItem[];
      focus: FocusSessionItem[];
    }>('/backup/export'),

  importBackup: (backup: Record<string, unknown>, mode: 'merge' | 'replace') =>
    request<{ success: boolean; mode: string; stats: Record<string, number>; message: string }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify({ backup, mode }),
    }),
};

export default api;
