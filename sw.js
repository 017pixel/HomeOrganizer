const CACHE_NAME = 'homeorganizer-v13'; // MUST be bumped on every release to bust old caches
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/pwa/icon-32.png',
  './assets/icons/pwa/icon-64.png',
  './assets/icons/pwa/apple-touch-icon.png',
  './assets/icons/pwa/icon-192.png',
  './assets/icons/pwa/icon-512.png',
  './assets/icons/pwa/icon-1024.png',
  './styles/design-system.css',
  './assets/fonts/archivo-black.woff2',
  './assets/fonts/space-grotesk-400.woff2',
  './assets/fonts/space-grotesk-500.woff2',
  './assets/fonts/space-grotesk-700.woff2',
  './js/db/idb.js',
  './js/logic/recurrence.js',
  './js/logic/weekOverview.js',
  './js/logic/plannerCore.js',
  './js/logic/scheduler.js',
  './js/logic/statsEngine.js',
  './js/ui/cardStack.js',
  './js/ui/listSwipe.js',
  './js/ui/app.js'
];
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE.map(u => new URL(u, self.registration.scope).toString())))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, resClone));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
