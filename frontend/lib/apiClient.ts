function sanitizeEnvUrl(u) {
  if (!u) return null
  if (typeof u !== 'string') return null
  if (u.includes('<') || u.includes('>')) return null
  return u.replace(/\/+$/, '')
}

function detectCodespaceBackend() {
  if (typeof window === 'undefined') return null
  try {
    const host = window.location.hostname // e.g. congenial-carnival-...-3000.app.github.dev
    if (host && host.includes('-3000') && host.includes('.github.dev')) {
      const backendHost = host.replace('-3000', '-4000')
      return `${window.location.protocol}//${backendHost}`
    }
  } catch (e) {}
  return null
}

const envUrl = sanitizeEnvUrl(process.env.NEXT_PUBLIC_API_URL) || sanitizeEnvUrl(process.env.NEXT_PUBLIC_API_BASE)
const detected = detectCodespaceBackend()
const BASE_URL = envUrl || detected || 'http://localhost:4000'

async function getCsrf(): Promise<string> {
  const r = await fetch(`${BASE_URL}/csrf-token`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to get CSRF token');
  const j = await r.json();
  return j?.csrfToken || '';
}

export async function apiGet(path: string): Promise<Response> {
  const tryOnce = async () => fetch(`${BASE_URL}${path}`, { credentials: 'include' });
  let r = await tryOnce();
  if (r.status === 401) {
    await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    r = await tryOnce();
  }
  return r;
}

export async function apiMutate(path: string, method: 'POST'|'PUT'|'PATCH'|'DELETE', body?: any): Promise<Response> {
  const token = await getCsrf();
  const doFetch = (csrf: string) => fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
    body: body ? JSON.stringify(body) : undefined
  });

  let r = await doFetch(token);
  if (r.status === 401) {
    await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    const t2 = await getCsrf();
    r = await doFetch(t2);
  }
  return r;
}
