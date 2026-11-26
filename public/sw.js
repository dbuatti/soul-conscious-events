// SoulFlow Service Worker
// Provides offline caching for core pages and assets.
// Bump CACHE_NAME on every deployment to invalidate old cached assets.

const CACHE_NAME = 'soulflow-v3';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/soulflow-logo.png',
  '/placeholder.svg',
];

// Install: cache static assets, then immediately take over.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean up old caches and claim all clients.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for pages and API calls, cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Navigations: network-first so the SPA shell stays fresh, falling back to
  // the cached shell and finally the branded offline page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/').then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  // Cache-first for same-origin static assets.
  if (url.origin === self.location.origin && url.pathname.startsWith('/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Only cache GET responses
          if (response.status === 200 && event.request.method === 'GET') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for Supabase API calls.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
});