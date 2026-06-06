const THIRD_PARTY = [
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
  (domain: string) => `https://icon.horse/icon/${domain}`,
  (domain: string) => `https://favicon.im/${domain}`,
];

function tryLoadImage(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function discoverFaviconUrl(pageUrl: string): Promise<string> {
  const u = new URL(pageUrl);
  const domain = u.hostname;

  // Tier 2: /favicon.ico
  const ico = await tryLoadImage(`${u.origin}/favicon.ico`);
  if (ico) return ico;

  // Tier 4: third-party services
  for (const fn of THIRD_PARTY) {
    const url = await tryLoadImage(fn(domain));
    if (url) return url;
  }

  // All failed → return first third-party URL anyway (browser will show broken img)
  return THIRD_PARTY[0](domain);
}
