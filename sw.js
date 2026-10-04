const CACHE_NAME = 'sipresdir-shell-v4';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  if (location.protocol === 'file:') {
    self.skipWaiting();
    return;
  }
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('sipresdir-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (location.protocol === 'file:') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    try {
      const response = await fetch(event.request);
      if (response && response.ok && response.type !== 'opaque') {
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const appShell = await cache.match('./index.html');
        if (appShell) return appShell;
      }
      return Response.error();
    }
  })());
});