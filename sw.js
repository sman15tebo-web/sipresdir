const CACHE_NAME = 'sipresdir-pwa-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './absensi.js',
  './disiplin.js',
  './imgsipresdir.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
