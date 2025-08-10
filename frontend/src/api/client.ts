export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';

type Json = Record<string, any>;

function getToken(): string | null {
  try { return localStorage.getItem('token'); } catch { return null; }
}

function setAuthCookie(token: string) {
  try {
    // 7 days
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `token=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {}
}

function clearAuthCookie() {
  try { document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax'; } catch {}
}

async function handleError(res: Response, path: string): Promise<never> {
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.error ? ` - ${data.error}` : '';
  } catch {
    try { detail = ` - ${await res.text()}`; } catch { /* ignore */ }
  }
  throw new Error(`${path} failed: ${res.status}${detail}`);
}

export async function post<T = Json>(path: string, body: Json): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) return handleError(res, path);
  return res.json();
}

export async function get<T = Json>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}) } });
  if (!res.ok) return handleError(res, path);
  return res.json();
}

// Domain helpers
export function postAgent(userId: number, message: string) {
  return post('/agent', { user_id: userId, message });
}

export function getHealth() {
  return get('/');
}

// Auth helpers
export async function login(usernameOrEmail: string, password: string) {
  const data = await post('/auth/login', { username: usernameOrEmail, email: usernameOrEmail, password });
  try { localStorage.setItem('token', data.token); } catch { }
  setAuthCookie(data.token);
  try { if (data.user?.id) localStorage.setItem('user_id', String(data.user.id)); } catch {}
  return data;
}

export async function register(payload: Json) {
  const data = await post('/auth/register', payload);
  try { localStorage.setItem('token', data.token); } catch { }
  setAuthCookie(data.token);
  try { if (data.user?.id) localStorage.setItem('user_id', String(data.user.id)); } catch {}
  return data;
}

export function logout() {
  try { localStorage.removeItem('token'); } catch {}
  clearAuthCookie();
  try { localStorage.removeItem('user_id'); } catch {}
}

export function getUserId(): number | null {
  try {
    const s = localStorage.getItem('user_id');
    return s ? parseInt(s) : null;
  } catch { return null; }
}
