// Classification Sandbox — Service Worker
// Bump CACHE_VERSION to force all clients to get the fresh build
const CACHE_VERSION = 'sandbox-v17';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// Install: cache all assets
self.addEventListener('install', e => {
  self.skipWaiting(); // activate immediately, don't wait
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).catch(() => {})
  );
});

// Activate: delete all old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// Fetch: network-first for HTML (always get fresh index.html), cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always fetch index.html fresh from network
  if(url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for everything else (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if(r && r.status === 200) {
        const clone = r.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
      }
      return r;
    }))
  );
});

// Message: support SKIP_WAITING from clients
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
