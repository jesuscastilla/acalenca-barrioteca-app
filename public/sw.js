const CACHE_NAME = 'barrioteca-v5';

// Al activarse, borrar TODAS las caches anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// No cachear nada. Siempre pedir a la red.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});