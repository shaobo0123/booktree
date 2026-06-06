import { ref, triggerRef, watch } from 'vue';
import { resolveFavicon } from '../utils/favicon';

const STORAGE_KEY = 'tree-bookmarks-favicon-cache';
const SUCCESS_TTL = 3 * 24 * 60 * 60 * 1000;   // 3 days
const FAILED_TTL = 1 * 24 * 60 * 60 * 1000;    // 1 day
const PRUNE_AGE = 30 * 24 * 60 * 60 * 1000;     // 30 days

interface CacheEntry {
  url: string | null;
  expiresAt: number;
  failedAt: number | null;
}

const cache = ref<Map<string, CacheEntry>>(loadCache());
const inFlight = new Set<string>();

function loadCache(): Map<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        const map = new Map<string, CacheEntry>(Object.entries(obj));
        pruneCache(map);
        return map;
      }
    }
  } catch {
    // ignore
  }
  return new Map();
}

function saveCache() {
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [k, v] of cache.value.entries()) {
      obj[k] = v;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage full
  }
}

function pruneCache(map: Map<string, CacheEntry>) {
  const cutoff = Date.now() - PRUNE_AGE;
  for (const [domain, entry] of map) {
    if (entry.expiresAt < cutoff) map.delete(domain);
  }
}

// Auto-persist on changes
watch(cache, saveCache, { deep: true });

async function refreshFavicon(domain: string) {
  if (inFlight.has(domain)) return;
  inFlight.add(domain);

  try {
    const url = await resolveFavicon(domain);

    cache.value.set(domain, {
      url,
      expiresAt: Date.now() + (url ? SUCCESS_TTL : FAILED_TTL),
      failedAt: url ? null : Date.now(),
    });
    triggerRef(cache);
  } finally {
    inFlight.delete(domain);
  }
}

function writeToCache(domain: string, url: string | null) {
  cache.value.set(domain, {
    url,
    expiresAt: Date.now() + (url ? SUCCESS_TTL : FAILED_TTL),
    failedAt: url ? null : Date.now(),
  });
  triggerRef(cache);
}

export function useFaviconCache() {
  function getFaviconUrl(pageUrl: string, serverFaviconUrl?: string | null): { url: string | null; loading: boolean } {
    let domain: string;
    try {
      domain = new URL(pageUrl).hostname;
    } catch {
      return { url: null, loading: false };
    }

    // Server provided a favicon URL → use directly, cache it
    if (serverFaviconUrl) {
      const existing = cache.value.get(domain);
      if (!existing || existing.url !== serverFaviconUrl) {
        writeToCache(domain, serverFaviconUrl);
      }
      return { url: serverFaviconUrl, loading: false };
    }

    const entry = cache.value.get(domain);
    const now = Date.now();

    if (entry) {
      if (entry.url && now < entry.expiresAt) {
        // Cache hit, not expired
        return { url: entry.url, loading: false };
      }
      if (entry.failedAt && now - entry.failedAt < FAILED_TTL) {
        // Recent failure, still in cooldown
        return { url: null, loading: false };
      }
      // Expired → show stale icon, refresh in background
      refreshFavicon(domain);
      return { url: entry.url, loading: true };
    }

    // No cache → show nothing, refresh in background
    refreshFavicon(domain);
    return { url: null, loading: true };
  }

  /** Write a server-provided favicon URL directly into cache */
  function seedFaviconCache(pageUrl: string, faviconUrl: string | null) {
    let domain: string;
    try { domain = new URL(pageUrl).hostname; } catch { return; }
    if (faviconUrl) writeToCache(domain, faviconUrl);
  }

  return { getFaviconUrl, seedFaviconCache };
}
