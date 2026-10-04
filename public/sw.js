// Service worker: offline stránka a cache statických súborov (PWA)
const CACHE = 'agentura-v1';
const STATIC = ['/static/css/app.css', '/static/js/assistant.js', '/static/offline.html', '/static/icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/static/')) { e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const c = res.clone(); caches.open(CACHE).then((cc) => cc.put(req, c)); return res; }))); return; }
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('/static/offline.html'))); }
});
