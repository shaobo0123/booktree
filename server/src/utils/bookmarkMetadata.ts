import { load } from 'cheerio';

const HTML_TIMEOUT_MS = 5000;
const ICON_TIMEOUT_MS = 5000;
const MAX_HTML_CHARS = 512_000;
const MAX_ICON_BYTES = 256 * 1024;

export interface BookmarkMetadata {
  url: string;
  title: string | null;
  faviconUrl: string | null;
  faviconBase64: string | null;
  faviconMime: string | null;
}

export function normalizeBookmarkUrl(value: string) {
  const raw = value.trim();
  if (!raw) {
    throw new Error('URL is required for bookmarks');
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Bookmark URL must use http or https');
  }

  return url.toString();
}

function cleanText(value: string | undefined | null) {
  return value?.replace(/\s+/g, ' ').trim() || null;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      redirect: 'follow',
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(url: string) {
  const response = await fetchWithTimeout(url, HTML_TIMEOUT_MS, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'TreeBookmarks/0.1 metadata fetcher'
    }
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    return null;
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_HTML_CHARS) {
    return null;
  }

  const html = await response.text();
  return {
    html: html.slice(0, MAX_HTML_CHARS),
    finalUrl: response.url || url
  };
}

function resolveUrl(href: string | undefined, baseUrl: string) {
  if (!href?.trim()) {
    return null;
  }

  try {
    const url = new URL(href.trim(), baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function iconCandidatesFromHtml(html: string, baseUrl: string) {
  const $ = load(html);
  const candidates: Array<{ url: string; score: number }> = [];

  $('link[rel][href]').each((_, element) => {
    const rel = ($(element).attr('rel') ?? '').toLowerCase();
    if (!rel.includes('icon')) {
      return;
    }

    const url = resolveUrl($(element).attr('href'), baseUrl);
    if (!url) {
      return;
    }

    let score = 10;
    if (rel.includes('apple-touch-icon')) {
      score = 30;
    } else if (rel.includes('shortcut')) {
      score = 20;
    } else if (rel.includes('mask-icon')) {
      score = 40;
    }

    candidates.push({ url, score });
  });

  const unique = new Map<string, number>();
  for (const candidate of candidates) {
    unique.set(candidate.url, Math.min(unique.get(candidate.url) ?? candidate.score, candidate.score));
  }

  return [...unique.entries()].sort((left, right) => left[1] - right[1]).map(([url]) => url);
}

function titleFromHtml(html: string) {
  const $ = load(html);
  return cleanText($('title').first().text()) ?? cleanText($('meta[property="og:title"]').attr('content'));
}

async function fetchIconData(url: string) {
  const response = await fetchWithTimeout(url, ICON_TIMEOUT_MS, {
    headers: {
      Accept: 'image/*',
      'User-Agent': 'TreeBookmarks/0.1 metadata fetcher'
    }
  });

  if (!response.ok) {
    return null;
  }

  const mime = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!mime.startsWith('image/')) {
    return null;
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength > MAX_ICON_BYTES) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ICON_BYTES) {
    return null;
  }

  return {
    base64: buffer.toString('base64'),
    mime
  };
}

export async function fetchBookmarkMetadata(inputUrl: string): Promise<BookmarkMetadata> {
  const normalizedUrl = normalizeBookmarkUrl(inputUrl);
  const fallbackUrl = new URL('/favicon.ico', normalizedUrl).toString();

  try {
    const page = await fetchHtml(normalizedUrl);
    const pageUrl = page?.finalUrl ?? normalizedUrl;
    const candidates = [...iconCandidatesFromHtml(page?.html ?? '', pageUrl), new URL('/favicon.ico', pageUrl).toString()];
    const faviconUrls = [...new Set(candidates.length > 0 ? candidates : [fallbackUrl])];

    let faviconUrl = faviconUrls[0] ?? fallbackUrl;
    let faviconBase64: string | null = null;
    let faviconMime: string | null = null;

    for (const candidate of faviconUrls) {
      const icon = await fetchIconData(candidate).catch(() => null);
      if (icon) {
        faviconUrl = candidate;
        faviconBase64 = icon.base64;
        faviconMime = icon.mime;
        break;
      }
    }

    return {
      url: pageUrl,
      title: page ? titleFromHtml(page.html) : null,
      faviconUrl,
      faviconBase64,
      faviconMime
    };
  } catch {
    return {
      url: normalizedUrl,
      title: null,
      faviconUrl: fallbackUrl,
      faviconBase64: null,
      faviconMime: null
    };
  }
}
