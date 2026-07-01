/*
 * Service worker for the Espresso Shot Advisor PWA.
 *
 * Dependency-free and resilient to Vite's hashed asset names: rather than
 * precaching a fixed manifest of filenames, it caches the app shell it can name
 * up-front and then runtime-caches everything else on first fetch
 * (stale-while-revalidate). This makes the app installable and usable offline
 * after the first visit. API calls are always network-only.
 *
 * Bump CACHE_VERSION to force old caches to be discarded on the next visit.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `espresso-advisor-${CACHE_VERSION}`;

// Things we can name ahead of time. Missing entries won't fail the install.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Add individually so one 404 doesn't abort the whole install.
      await Promise.all(
        APP_SHELL.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache API traffic or cross-origin requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigations: try the network first (fresh HTML), fall back to the cached
  // shell when offline so the app still boots.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match('/index.html'));
      }),
    );
    return;
  }

  // Everything else (JS, CSS, icons): stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    }),
  );
});
