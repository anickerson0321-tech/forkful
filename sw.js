// Offline support and Android share target.
// App files load from the network when online (so updates show up right away)
// and fall back to the saved copy when offline.
const CACHE = 'forkful-v3';
const SHARE_CACHE = 'forkful-share';
const SHELL = [
  './', './index.html', './css/app.css', './js/app.js', './js/parse.js', './js/store.js', './js/samples.js', './js/import.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Something shared to Forkful from another app (a link, text or a screenshot) arrives as a
// POST. Stash it, then open the app, which picks it up and imports it.
async function handleShare(request) {
  const form = await request.formData();
  const cache = await caches.open(SHARE_CACHE);
  const file = form.get('image');
  if (file && typeof file !== 'string' && file.size) {
    await cache.put('shared-image', new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }));
  }
  const text = ['url', 'text', 'title'].map((k) => form.get(k)).filter((v) => typeof v === 'string' && v).join(' ');
  await cache.put('shared-text', new Response(text));
  return Response.redirect(new URL('./?shared=1#/recipes', self.registration.scope).href, 303);
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith(handleShare(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;
  const key = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key, { ignoreSearch: e.request.mode === 'navigate' })),
  );
});
