// Service Worker — Strategi: Network First untuk semua file
// Otomatis selalu ambil versi terbaru dari server.
// Cache diperbarui sendiri setiap berhasil fetch.
// Tidak perlu ubah nomor versi secara manual.

const CACHE_NAME = 'sipresdir-cache';

self.addEventListener('install', event => {
  // Aktifkan segera tanpa menunggu tab lama ditutup
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Ambil kendali semua tab yang sedang buka tanpa perlu reload
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Hanya tangani request GET ke URL yang sama-origin
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Berhasil dari network — simpan ke cache sebagai backup offline
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      })
      .catch(() => {
        // Gagal dari network (offline) — gunakan cache terakhir sebagai fallback
        return caches.match(event.request);
      })
  );
});

