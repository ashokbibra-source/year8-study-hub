// ─────────────────────────────────────────────────────────
// Year 8 Study Hub — Service Worker v5
// Strategy: Install-time pre-cache → cache-first for all requests
// Result: Works 100% offline after first visit
// ─────────────────────────────────────────────────────────

const CACHE_VERSION = 'v5';
const CACHE_NAME = `year8-hub-${CACHE_VERSION}`;

// Every file the app needs — pre-cached at install time
const PRECACHE_URLS = [
  '/year8-study-hub/',
  '/year8-study-hub/index.html',
  '/year8-study-hub/manifest.json',
  '/year8-study-hub/favicon.png',
  // App icons
  '/year8-study-hub/icon-57.png',
  '/year8-study-hub/icon-60.png',
  '/year8-study-hub/icon-72.png',
  '/year8-study-hub/icon-76.png',
  '/year8-study-hub/icon-114.png',
  '/year8-study-hub/icon-120.png',
  '/year8-study-hub/icon-144.png',
  '/year8-study-hub/icon-152.png',
  '/year8-study-hub/icon-167.png',
  '/year8-study-hub/icon-180.png',
  '/year8-study-hub/icon-192.png',
  '/year8-study-hub/icon-512.png',
  '/year8-study-hub/icon-1024.png',
  // Splash screens
  '/year8-study-hub/splash-iphone-se.png',
  '/year8-study-hub/splash-iphone-8.png',
  '/year8-study-hub/splash-iphone-xr.png',
  '/year8-study-hub/splash-iphone-x.png',
  '/year8-study-hub/splash-iphone-12.png',
  '/year8-study-hub/splash-iphone-14pro.png',
  '/year8-study-hub/splash-iphone-14promax.png',
];

// ── Install: pre-cache everything immediately ──────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // activate immediately, don't wait for old SW to die
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching', PRECACHE_URLS.length, 'files');
      // addAll fetches and caches atomically — if any fail, install fails gracefully
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err.message))
        )
      );
    })
  );
});

// ── Activate: delete ALL old caches immediately ────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Now active, claiming all clients');
      return self.clients.claim(); // take control of all open tabs immediately
    })
  );
});

// ── Fetch: cache-first, stale-while-revalidate ────────────
// 1. Serve from cache instantly if available
// 2. In background, fetch fresh version and update cache
// 3. If not in cache and network fails → return offline fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension and non-http requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Kick off a background network fetch to keep cache fresh
      const networkFetch = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => null); // network failure — just return null

      // Return cached version immediately if we have it
      if (cachedResponse) {
        // Also update in background (stale-while-revalidate)
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      // Not in cache — wait for network
      return networkFetch.then(response => {
        if (response) return response;

        // Total offline fallback: serve the main app shell
        return caches.match('/year8-study-hub/') ||
               caches.match('/year8-study-hub/index.html');
      });
    })
  );
});

// ── Message: force update from page ───────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
