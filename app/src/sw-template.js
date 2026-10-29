// FORM. service worker. Generated at build time from src/sw-template.js.
// App files are precached; navigation falls back to the cached app shell when offline.
const VERSION = '__VERSION__';
const CACHE = `form-next-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Only remove our own old caches; the legacy app's caches belong to the legacy app.
    await Promise.all(keys.filter((k) => k.startsWith('form-next-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
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
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })());
});
