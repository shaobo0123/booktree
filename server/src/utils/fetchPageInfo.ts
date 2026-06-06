import { load } from 'cheerio';

export interface PageInfo {
  title: string | null;
  faviconUrl: string | null;
}

/**
 * Fetch a page's HTML and extract its title and favicon URL.
 * Never throws — returns { title: null, faviconUrl: null } on any error.
 */
export async function fetchPageInfo(url: string): Promise<PageInfo> {
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

    if (!res.ok) return { title: null, faviconUrl: null };

    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      return { title: null, faviconUrl: null };
    }

    const html = await res.text();
    const $ = load(html);

    // Extract title — filter out common SPA loading placeholders
    const rawTitle = $('title').first().text().trim();
    const skipTitles = new Set(['loading', 'loading...', 'loadings', '正在加载', '页面加载中']);
    const title = (rawTitle && !skipTitles.has(rawTitle.toLowerCase())) ? rawTitle : null;

    // Extract favicon from <link> tags (priority order)
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];

    let faviconUrl: string | null = null;
    for (const sel of faviconSelectors) {
      const href = $(sel).first().attr('href');
      if (href) {
        faviconUrl = resolveUrl(href, url);
        break;
      }
    }

    return { title, faviconUrl };
  } catch {
    return { title: null, faviconUrl: null };
  }
}

/** Resolve a potentially relative URL against a base page URL */
function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}
