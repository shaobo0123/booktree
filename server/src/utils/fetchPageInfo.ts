import { load } from 'cheerio';

export interface PageInfo {
  title: string | null;
  faviconUrl: string | null;
  faviconBase64: string | null;
  faviconMime: string | null;
}

/**
 * Fetch a page's HTML and extract its title and favicon (as base64).
 * Falls back to multiple third-party icon services when site has no favicon.
 * Never throws — returns nulls on any error.
 */
export async function fetchPageInfo(url: string): Promise<PageInfo> {
  let title: string | null = null;
  let domain = '';

  try { domain = new URL(url).hostname; } catch { return empty(); }

  // --- Fetch HTML for title and <link> favicon ---
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; BookTreeBot/1.0)',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (res.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('text/html') || ct.includes('application/xhtml')) {
        const html = await res.text();
        const $ = load(html);

        // Extract title — filter out common SPA loading placeholders
        const rawTitle = $('title').first().text().trim();
        const skipTitles = new Set(['loading', 'loading...', 'loadings', '正在加载', '页面加载中']);
        title = (rawTitle && !skipTitles.has(rawTitle.toLowerCase())) ? rawTitle : null;

        // Extract favicon URL from <link> tags
        const faviconSelectors = [
          'link[rel="icon"]',
          'link[rel="shortcut icon"]',
          'link[rel="apple-touch-icon"]',
        ];
        for (const sel of faviconSelectors) {
          const href = $(sel).first().attr('href');
          if (href) {
            const resolved = resolveUrl(href, url);
            if (resolved) {
              const img = await downloadImage(resolved);
              if (img.faviconBase64) return { title, faviconUrl: resolved, ...img };
            }
            break; // found a link tag, stop searching selectors
          }
        }
      }
    }
  } catch { /* continue to fallbacks */ }

  // --- Fallback chain: try downloading favicon from multiple sources ---
  const candidates = [
    `https://${domain}/favicon.ico`,
    `https://a.favicon.im/${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://icon.horse/icon/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
  ];

  for (const candidateUrl of candidates) {
    const img = await downloadImage(candidateUrl);
    if (img.faviconBase64) return { title, faviconUrl: candidateUrl, ...img };
  }

  return { title, faviconUrl: null, faviconBase64: null, faviconMime: null };
}

async function downloadImage(imgUrl: string): Promise<{ faviconBase64: string | null; faviconMime: string | null }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(imgUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BookTreeBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (!res.ok) return { faviconBase64: null, faviconMime: null };

    const mime = res.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await res.arrayBuffer());
    // Skip if too large (>100KB) or too small (likely 1x1 pixel or error page)
    if (buf.length < 10 || buf.length > 100 * 1024) {
      return { faviconBase64: null, faviconMime: null };
    }
    return { faviconBase64: buf.toString('base64'), faviconMime: mime };
  } catch {
    return { faviconBase64: null, faviconMime: null };
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function empty(): PageInfo {
  return { title: null, faviconUrl: null, faviconBase64: null, faviconMime: null };
}
