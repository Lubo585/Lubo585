/* NazovPortalu – service worker (PWA): offline shell, cache statiky, HTML sieť-najprv */
var VERSION = 'np-v1';
var SHELL = ['/', '/index.html', '/css/style.css', '/js/config.js', '/js/app.js', '/js/native.js', '/js/supabase.js', '/img/favicon.svg', '/404.html'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;                 // Supabase a CDN necháme na sieť
  if (req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1) {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); return r; })
      .catch(function () { return caches.match(req).then(function (r) { return r || caches.match('/404.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (r) { return r || fetch(req).then(function (res) { var cp = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, cp); }); return res; }); }));
});
