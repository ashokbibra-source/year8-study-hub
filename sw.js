// Year 8 Study Hub — Service Worker v4
const CACHE_NAME = 'year8-hub-v4';

const URLS_TO_CACHE = [
  '/year8-study-hub/',
  '/year8-study-hub/index.html',
  '/year8-study-hub/manifest.json',
  '/year8-study-hub/favicon.png',
  // Icons
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
  '/year8-study-hub/splash-iphone-14promax.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Google Fonts — network first, cache fallback
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(r => { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c)); return r; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — cache first, update in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(r => {
        if (r && r.status === 200) {
          const c = r.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, c));
        }
        return r;
      });
      return cached || network;
    })
  );
});
