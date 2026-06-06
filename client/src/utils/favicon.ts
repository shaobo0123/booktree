/** Try to load an image URL with a timeout */
function tryLoadImage(url: string, timeout = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: string | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const img = new Image();
    const timer = setTimeout(() => done(null), timeout);

    img.onload = () => {
      clearTimeout(timer);
      done(url);
    };
    img.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    img.src = url;
  });
}

const CANDIDATES = [
  (domain: string) => `https://${domain}/favicon.ico`,
  (domain: string) => `https://favicon.im/${domain}`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://icon.horse/icon/${domain}`,
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
];

/** Try multiple favicon sources in order, return first success or null */
export async function resolveFavicon(domain: string): Promise<string | null> {
  for (const fn of CANDIDATES) {
    const url = await tryLoadImage(fn(domain));
    if (url) return url;
  }
  return null;
}
