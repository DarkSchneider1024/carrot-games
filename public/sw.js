/**
 * Carrot Games — PWA Service Worker
 * Strategy: Stale-While-Revalidate & Cache First for Static Assets
 */

const CACHE_NAME = 'carrot-games-v1';
const STATIC_ASSETS = [
  '/carrot-games/',
  '/carrot-games/index.html',
  '/carrot-games/manifest.json',
  '/carrot-games/assets/images/logo_carrot.png',
  '/carrot-games/assets/images/icon_xiangqi.png',
  '/carrot-games/assets/images/icon_gomoku.png',
  '/carrot-games/assets/images/icon_poker.png',
  '/carrot-games/assets/images/icon_192.png',
  '/carrot-games/assets/images/icon_512.png',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [PWA Service Worker] Caching static app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache error (ignored):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore cross-origin Google Fonts / WebRTC Signaling requests for dynamic caching
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
