/* The manifest is injected by vite-plugin-pwa at build time. */
const assets = self.__WB_MANIFEST;
const version = assets.map((entry) => `${entry.url}:${entry.revision || ''}`).join('|');
let hash = 0;
for (const char of version) hash = (hash * 31 + char.charCodeAt(0)) | 0;
const APP_CACHE = `wordquest-app-${hash >>> 0}`;
const IMAGE_CACHE = 'wordquest-illustrations';
const MODE_CACHE = 'wordquest-mode';
const MODE_URL = '/__wordquest_offline_mode__';

self.addEventListener('message', (event) => {
  if (event.data === 'WORDQUEST_OFFLINE_CAPABILITY') {
    event.ports[0]?.postMessage('ready');
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    // includeAssets can also match globPatterns; Cache.addAll rejects duplicate URLs.
    await cache.addAll([...new Set(assets.map((entry) => entry.url))]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('wordquest-app-') && name !== APP_CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  event.respondWith((async () => {
    const forcedOffline = Boolean(await (await caches.open(MODE_CACHE)).match(MODE_URL));
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    if (forcedOffline) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate' && sameOrigin) {
        const app = await caches.match('/index.html');
        if (app) return app;
      }
      return new Response('Offline mode', { status: 503, statusText: 'Offline mode' });
    }

    if (request.method !== 'GET') return fetch(request);
    if (request.mode === 'navigate' && sameOrigin) {
      try { return await fetch(request); }
      catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    }
    if (sameOrigin && url.pathname.startsWith('/api/illustrations/')) {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }
    if (sameOrigin && !url.pathname.startsWith('/api/')) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return fetch(request);
  })());
});
