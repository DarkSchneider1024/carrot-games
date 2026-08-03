/**
 * Carrot Games — PWA Service Worker (Auto-Update Version)
 * Strategy: Network-First for HTML/JS/SW & Stale-While-Revalidate for Assets
 */

const CACHE_NAME = 'carrot-games-v3';
const STATIC_ASSETS = [
  '/carrot-games/',
  '/carrot-games/index.html',
  '/carrot-games/manifest.json',
  '/carrot-games/assets/images/loading_splash.png',
  '/carrot-games/assets/images/logo_carrot.png',
  '/carrot-games/assets/images/icon_xiangqi.png',
  '/carrot-games/assets/images/icon_gomoku.png',
  '/carrot-games/assets/images/icon_poker.png',
  '/carrot-games/assets/images/icon_192.png',
  '/carrot-games/assets/images/icon_512.png',
];

// Skip waiting message listener
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [PWA SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

// Activate Event: Delete old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('🧹 [PWA SW] Deleting obsolete cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for HTML & JS, Stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache sw.js or html strictly
  if (url.pathname.endsWith('sw.js') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

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
