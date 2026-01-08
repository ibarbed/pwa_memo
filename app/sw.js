// Service Worker para PWA Memo - Offline First
const CACHE_NAME = 'memo-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './data/mental_casillero.js',
  './data/objetos.js',
  './data/conceptos.js',
  './icons/icon.svg'
];

// Instalación: cachear el app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first para assets, fallback a index.html para navegación
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar requests GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        // No cachear si no es una respuesta válida
        if (!response || response.status !== 200) {
          return response;
        }

        // Cachear la nueva respuesta
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Si es navegación y falla, devolver index.html cacheado
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
