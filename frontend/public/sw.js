/* FamilyCare service worker — hand-rolled for offline shell.
 *
 * Strategy:
 *  - Install: pre-cache app shell.
 *  - Activate: clean old caches.
 *  - Fetch: stale-while-revalidate for navigations + same-origin assets;
 *    network-first with 5s timeout for /api/* (so we don't serve stale data
 *    when online, but fall back to last-known cache when offline).
 */

const VERSION = 'v1';
const SHELL_CACHE = `familycare-shell-${VERSION}`;
const ASSET_CACHE = `familycare-assets-${VERSION}`;
const API_CACHE = `familycare-api-${VERSION}`;

const SHELL_URLS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, ASSET_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

const networkFirstWithTimeout = async (request, timeoutMs = 5000) => {
  const cache = await caches.open(API_CACHE);
  try {
    const networkPromise = fetch(request);
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeoutMs)
    );
    const response = await Promise.race([networkPromise, timeout]);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ message: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || networkPromise;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API: network-first with offline fallback to last cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request));
    return;
  }

  // SPA navigations: serve cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
