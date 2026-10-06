const CACHE_PREFIX = 'holosoft-shell';
const CACHE_NAME = `${CACHE_PREFIX}-v2`;
const scopeUrl = new URL(self.registration.scope);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const relativePath = url.pathname.slice(scopeUrl.pathname.length);
  if (relativePath === 'sw.js' || relativePath.startsWith('cms/') || relativePath === 'cms') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(scopeUrl.href)) || Response.error();
      }
    })());
    return;
  }

  if (['script','style','image','font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);
      return cached || (await network) || Response.error();
    })());
  }
});
