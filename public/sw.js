/**
 * Vartica PWA Service Worker
 * Version: 2.0.0 - Auto-increment on each deploy
 * 
 * IMPORTANT: Change CACHE_VERSION on every deployment to force updates!
 */
const CACHE_VERSION = 'v2.0.1'; // CHANGE THIS ON EVERY DEPLOY
const CACHE_NAME = `vartica-${CACHE_VERSION}`;

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico',
];

// Install event - cache static assets and activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Forces new SW to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate event - clean up ALL old caches on every update
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL old caches on every update
                    return caches.delete(cacheName);
                })
            );
        })
    );
    // Immediately control all open tabs with new SW
    return self.clients.claim();
});

// Fetch event - network-first strategy for fresh content
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // Skip external resources that shouldn't be cached
    const externalDomains = [
        'paystack', 'supabase', 'google-analytics', 'googletagmanager',
        'hotjar', 'datadoghq', 'facebook', 'fbcdn', 'paypal',
        'unsplash', 'placeholder', 'cloudinary', 'hcaptcha',
        'mixpanel', 'polyfill.io', 'jquery', 'cloudflare'
    ];

    if (externalDomains.some(domain => url.hostname.includes(domain))) {
        return; // Let browser handle these directly
    }

    // Network-first strategy for fresh content
    event.respondWith(
        fetch(request).then((response) => {
            // Cache successful responses
            if (response && response.status === 200 && request.method === 'GET') {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            // Fallback to cache if network fails
            return caches.match(request);
        })
    );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage(CACHE_VERSION);
    }
});
