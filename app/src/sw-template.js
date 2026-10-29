// FORM. service worker. Generated at build time from src/sw-template.js.
// App files are precached; navigation falls back to the cached app shell when offline.
const VERSION = '__VERSION__';
const CACHE = `form-next-${VERSION}`;
const PRECACHE = __PRECACHE__;
// Exercise photos: cached in the background after activation, so the first start stays fast.
const MEDIA = __MEDIA__;
const MEDIA_CACHE = 'form-next-media';

async function warmMedia() {
  const cache = await caches.open(MEDIA_CACHE);
  for (const file of MEDIA) {
    if (await cache.match(file)) continue;
    try {
      const res = await fetch(file);
      if (res.ok) await cache.put(file, res);
    } catch {
      return; // offline or interrupted: the next start continues
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Only remove our own old caches; the legacy app's caches belong to the legacy app.
    await Promise.all(keys.filter((k) => k.startsWith('form-next-') && k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
  void warmMedia();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'warm-media') event.waitUntil(warmMedia());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network first for the page itself, so updates arrive; cached shell when offline.
    event.respondWith(fetch(request).catch(async () => (await caches.match('./index.html', { ignoreSearch: true })) ?? (await caches.match('./')) ?? Response.error()));
    return;
  }
  // Built files have content hashes: cache first is safe.
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname.includes('/media/')) {
      const copy = response.clone();
      caches.open(MEDIA_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })());
});
