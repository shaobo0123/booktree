const API_BASE = '/api/auth';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function login(password: string) {
  return request<{ token: string; username: string }>(`${API_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export function checkAuthStatus() {
  return request<{ username: string }>(`${API_BASE}/status`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
}

export function getToken(): string | null {
  return localStorage.getItem('booktree_token');
}

export function setToken(token: string): void {
  localStorage.setItem('booktree_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('booktree_token');
}
