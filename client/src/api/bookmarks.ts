import type { BookmarkFormPayload, BookmarkNode } from '../types/bookmark';
import { getToken } from './auth';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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

export function getBookmarkTree() {
  return request<BookmarkNode[]>('/api/bookmarks/tree');
}

export function createBookmark(payload: BookmarkFormPayload) {
  return request<BookmarkNode>('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateBookmark(id: string, payload: Partial<BookmarkFormPayload>) {
  return request<BookmarkNode>(`/api/bookmarks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteBookmark(id: string) {
  const response = await fetch(`/api/bookmarks/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? 'Delete failed');
  }
}

export function searchBookmarks(query: string) {
  return request<BookmarkNode[]>(`/api/bookmarks/search?q=${encodeURIComponent(query)}`);
}

export async function importBookmarks(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/bookmarks/import', {
    method: 'POST',
    body: formData,
    headers: authHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? 'Import failed');
  }

  return response.json() as Promise<{ imported: number }>;
}

export function reorderBookmarks(parentId: string | null, orderedIds: string[]) {
  return request<{ ok: boolean }>('/api/bookmarks/reorder', {
    method: 'PUT',
    body: JSON.stringify({ parent_id: parentId, ordered_ids: orderedIds })
  });
}

export function exportBookmarks(rootId?: string | null) {
  const token = getToken();
  const query = rootId ? `?root_id=${encodeURIComponent(rootId)}` : '';
  // For file downloads, pass token as query param (can't set Authorization header)
  const sep = query ? '&' : '?';
  const tokenParam = token ? `${sep}token=${encodeURIComponent(token)}` : '';
  window.location.href = `/api/bookmarks/export${query}${tokenParam}`;
}

export function clearFavicons() {
  return request<{ ok: boolean }>('/api/bookmarks/clear-favicons', { method: 'POST' });
}

export function fetchBookmarkFavicon(id: string) {
  return request<{ favicon_base64: string | null; favicon_mime: string | null }>(`/api/bookmarks/${id}/favicon`);
}
