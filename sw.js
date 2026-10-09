// Offline support: cache the app shell, serve it cache-first, refresh in the background.
const CACHE = 'forkful-v2';
const SHELL = [
  './', './index.html', './css/app.css', './js/app.js', './js/parse.js', './js/store.js', './js/samples.js', './js/import.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Share-target launches carry a query string; serve the shell for them.
  const key = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith(
    caches.match(key).then((cached) => {
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok && e.request.mode !== 'navigate') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
