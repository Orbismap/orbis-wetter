/* Orbis Wetter – Service Worker.
 *
 * Die App-Shell (HTML, JS, CSS, Icons, Mondbilder) wird beim Install aus der
 * vom Build erzeugten precache.json vorgehalten. Wetterdaten und Karten kommen
 * zur Laufzeit hinzu: network-first, damit Online immer aktuell ist, mit Cache
 * als Offline-Fallback. Grosse Binärdaten (OWX-Felder) werden nicht gecacht. */

const BASE = '/wetter/';
const MANIFEST_URL = `${BASE}precache.json`;
const META_CACHE = 'orbis-wetter-meta';
const VERSION_KEY = `${BASE}__sw_version`;
const MAX_RUNTIME_ENTRIES = 200;
const MAX_CACHEABLE_BYTES = 3_000_000;

const cacheName = (kind, version) => `orbis-wetter-${kind}-${version}`;

let writesSinceTrim = 0;

/** Vom Build erzeugte Precache-Liste; fehlt sie (offline), wird nur die Shell erneuert. */
async function readManifest() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && typeof data.version === 'string' && Array.isArray(data.urls)) return data;
  } catch {
    // Offline oder noch kein Build mit Precache-Liste.
  }
  return null;
}

/** Version offline aus dem Meta-Cache lesen – sonst wären die Shell-Caches nicht auffindbar. */
let activePromise;
function activeCaches() {
  if (!activePromise) {
    activePromise = (async () => {
      const data = await readManifest();
      const meta = await caches.open(META_CACHE);
      let version = data?.version;
      if (version) {
        await meta.put(VERSION_KEY, new Response(version));
      } else {
        const stored = await meta.match(VERSION_KEY);
        version = stored ? await stored.text() : 'base';
      }
      return {
        shell: cacheName('shell', version),
        runtime: cacheName('runtime', version),
        urls: data?.urls ?? null,
      };
    })();
  }
  return activePromise;
}

/** Ein fehlendes Asset darf die Installation nicht scheitern lassen. */
async function precache(cache, urls) {
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift();
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) await cache.put(url, response);
      } catch {
        // z. B. vorübergehend offline – beim nächsten Install erneut versuchen.
      }
    }
  });
  await Promise.all(workers);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const { shell, urls } = await activeCaches();
      if (urls) await precache(await caches.open(shell), urls);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const { shell, runtime } = await activeCaches();
      const keep = new Set([shell, runtime, META_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('orbis-wetter-') && !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function put(cache, key, response) {
  // Keine grossen Felder/OWX-Tiles – die sprengen sonst das Cache-Quota.
  const type = response.headers.get('content-type') || '';
  const length = Number(response.headers.get('content-length'));
  if (type.includes('octet-stream') || (Number.isFinite(length) && length > MAX_CACHEABLE_BYTES)) return;
  await cache.put(key, response);
  // Cache.keys() ist teuer – nur gelegentlich prüfen statt bei jedem Fetch.
  if (++writesSinceTrim < 20) return;
  writesSinceTrim = 0;
  const keys = await cache.keys();
  if (keys.length > MAX_RUNTIME_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((old) => cache.delete(old)));
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  // Vite liefert "Vary: Origin" – Modul-Scripts haben einen Origin-Header, der
  // Precache-Fetch nicht. Sonst wird die gecachte Datei nicht gefunden.
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (!response.ok) return Response.error();
  await put(cache, request, response.clone());
  return response;
}

async function networkFirst(request, name, cacheKey) {
  const cache = await caches.open(name);
  const key = cacheKey ?? request;
  try {
    const response = await fetch(request);
    // Auch Proxy-Fehler (502/503) müssen auf den Cache fallen dürfen.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await put(cache, key, response.clone());
    return response;
  } catch {
    const hit = (await cache.match(key, { ignoreVary: true })) ?? (await caches.match(`${BASE}index.html`, { ignoreVary: true }));
    return hit ?? Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith(activeCaches().then(({ shell }) => networkFirst(request, shell, `${BASE}index.html`)));
    return;
  }
  // Only the app's own files are cache-first; other same-origin paths (e.g. /wx-render/) must stay fresh.
  if (url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(activeCaches().then(({ shell }) => cacheFirst(request, shell)));
    return;
  }
  event.respondWith(activeCaches().then(({ runtime }) => networkFirst(request, runtime)));
});
