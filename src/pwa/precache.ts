/** Baut die URL-Liste für den App-Shell-Cache des Service Workers.
 *  Rein gehalten, damit sie ohne Vite-Build getestet werden kann. */

export function precacheUrls(
  base: string,
  bundleFiles: string[],
  publicFiles: string[],
): string[] {
  const basePath = base.endsWith('/') ? base : `${base}/`;
  const urls = new Set<string>([basePath, `${basePath}index.html`]);

  for (const file of [...bundleFiles, ...publicFiles]) {
    const name = file.replace(/^\/+/, '');
    // Der SW lädt die Liste selbst; er muss sie nicht vorhalten.
    if (name === 'sw.js' || name === 'precache.json') continue;
    urls.add(`${basePath}${name}`);
  }

  return [...urls].sort();
}
