const CACHE_NAME = 'barrioteca-v4';

// Solo cachear recursos estaticos que nunca cambian (iconos, manifest)
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon.svg',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Network-first para todo. Si no hay red, servir lo que haya en cache.
self.addEventListener('fetch', (event) => {
  // No cachear peticiones a la API
  if (event.request.url.includes('api-proxy.php') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar en cache solo respuestas validas
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});