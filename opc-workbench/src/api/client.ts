/**
 * OPC Workbench - 统一 API 客户端
 * 封装所有 fetch 调用，统一错误处理与类型推断
 */

const BASE_URL = '/api';

async function request<T = any>(
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
  getOngoing: () => request<{ items: any[] }>('/ongoing'),
  createOngoing: (data: { title: string; description?: string; progress?: number }) =>
    request<{ item: any }>('/ongoing', { method: 'POST', body: JSON.stringify(data) }),
  updateOngoing: (id: string, patch: { title?: string; description?: string; progress?: number }) =>
    request<{ item: any }>(`/ongoing/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteOngoing: (id: string) =>
    request<{ success: boolean }>(`/ongoing/${id}`, { method: 'DELETE' }),

  // Countdowns
  getCountdowns: () => request<{ countdowns: any[] }>('/countdowns'),
  createCountdown: (data: { title: string; target_date: string; color?: string }) =>
    request<{ countdown: any }>('/countdowns', { method: 'POST', body: JSON.stringify(data) }),
  deleteCountdown: (id: string) =>
    request<{ success: boolean }>(`/countdowns/${id}`, { method: 'DELETE' }),

  // Links
  getLinks: () => request<{ links: any[] }>('/links'),
  createLink: (data: { title: string; url: string; icon?: string }) =>
    request<{ link: any }>('/links', { method: 'POST', body: JSON.stringify(data) }),
  deleteLink: (id: string) =>
    request<{ success: boolean }>(`/links/${id}`, { method: 'DELETE' }),

  // Focus sessions
  getFocus: () => request<{ sessions: any[]; todayCount: number; totalMinutes: number }>('/focus'),
  createFocus: (data: { duration_min: number; task?: string }) =>
    request<{ session: any }>('/focus', { method: 'POST', body: JSON.stringify(data) }),

  // News
  getNews: (params?: { category?: string; since?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.since) qs.set('since', String(params.since));
    const q = qs.toString();
    return request<{ items: any[]; cached: boolean; source: string }>(`/news${q ? '?' + q : ''}`);
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
};

export default api;
