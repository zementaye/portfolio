// iStore by Sophi — service worker
// Caches the core pages + favicons so the site still opens (and shows a
// friendly offline page for anything uncached) without a connection.
// Bump CACHE_NAME whenever you change these files so old caches are dropped.

const CACHE_NAME = 'istore-sophi-v1';
const CORE_ASSETS = [
  'istore.html',
  'products.html',
  'contact.html',
  '404.html',
  'manifest.json',
  'favicons/favicon.ico',
  'favicons/favicon-32x32.png',
  'favicons/favicon-16x16.png',
  'favicons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for HTML (so visitors always get the latest content when
// online), falling back to cache — or the 404 page — when offline.
// Cache-first for everything else (images, favicons) since those rarely change.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(res => res || caches.match('404.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
