import { reactive } from 'vue';

interface FaviconData {
  base64: string;
  mime: string;
}

// Module-level reactive cache shared across all BookmarkNodeIcon instances
const faviconCache = reactive<Map<string, FaviconData>>(new Map());
const inFlight = new Map<string, Promise<FaviconData | null>>();

export function useFaviconFetcher() {
  async function fetchFavicon(bookmarkId: string): Promise<FaviconData | null> {
    if (faviconCache.has(bookmarkId)) return faviconCache.get(bookmarkId)!;

    if (inFlight.has(bookmarkId)) return inFlight.get(bookmarkId)!;

    const promise = (async () => {
      try {
        const res = await fetch(`/api/bookmarks/${bookmarkId}/favicon`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.favicon_base64 && data.favicon_mime) {
          const result: FaviconData = { base64: data.favicon_base64, mime: data.favicon_mime };
          faviconCache.set(bookmarkId, result);
          return result;
        }
        return null;
      } catch {
        return null;
      } finally {
        inFlight.delete(bookmarkId);
      }
    })();

    inFlight.set(bookmarkId, promise);
    return promise;
  }

  return { fetchFavicon, faviconCache };
}
