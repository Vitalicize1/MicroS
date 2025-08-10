export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:5001';

type Json = Record<string, any>;

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return handleError(res, path);
  return res.json();
}

export async function get<T = Json>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
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
