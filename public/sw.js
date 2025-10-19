// public/sw.js
const CACHE_NAME = 'vartica-cache-v3'; // 🔥 bump version when redeploying
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
];

// Install event: pre-cache important static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch event: network-first for assets, cache-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 🧹 Skip requests to Vite's /assets/ (these change every build)
  if (request.url.includes('/assets/')) {
    return; // Don't cache hashed build assets
  }

  // Handle navigation (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});
