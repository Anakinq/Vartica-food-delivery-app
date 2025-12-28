// Service Worker for Vartica PWA
const CACHE_NAME = 'vartica-v1.0.0';
const STATIC_CACHE = 'vartica-static-v1.0.0';
const DYNAMIC_CACHE = 'vartica-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.ico',
    // Add other critical assets that should be cached
    '/src/main.tsx',
    '/src/App.tsx',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip chrome extensions and non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // Skip requests that are likely to cause MIME type issues
    if (request.destination === 'script' && url.pathname.includes('node_modules')) {
        return;
    }

    // Skip all external resources that cause CSP issues - let browser handle them directly
    if (url.hostname === 'js.paystack.co' ||
        url.hostname === 'paystack.com' ||
        url.hostname === 'checkout.paystack.com' ||
        url.hostname.includes('.paystack.com') ||
        url.hostname === 'images.unsplash.com' ||
        url.hostname === 'via.placeholder.com' ||
        url.hostname === 'res.cloudinary.com' ||
        url.hostname.includes('hcaptcha.com') ||
        url.hostname.includes('challenge-platform') ||
        url.hostname.includes('cloudflareinsights.com') ||
        url.hostname.includes('datadoghq-browser-agent.com') ||
        url.hostname.includes('googletagmanager.com') ||
        url.hostname.includes('google-analytics.com') ||
        url.hostname.includes('analytics.google.com') ||
        url.hostname.includes('doubleclick.net')) {
        return;
    }

    // Network-first for API calls
    if (
        url.hostname.includes('supabase.co') ||
        url.hostname.includes('paystack.co')
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                // Return cached response immediately if available
                if (cachedResponse) {
                    // Update cache in background
                    fetch(request).then((response) => {
                        if (response && response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, responseClone);
                            });
                        }
                    }).catch(() => { });

                    return cachedResponse;
                }

                // If no cached response, fetch from network
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                }).catch(() => {
                    // Last resort: try to return any cached response
                    return caches.match(request);
                });
            })
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                // Don't cache failed responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Only cache GET requests
                if (request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            });
        })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});