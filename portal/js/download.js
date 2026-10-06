/* Stránka /aplikacia.html: detekcia zariadenia, načítanie version.json, odkaz na APK a kontrolný súčet */
(function () {
  'use strict';
  var cfg = window.NP_CONFIG || {};
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var root = document.querySelector('[data-download]');
  if (!root) return;
  root.setAttribute('data-platform', isAndroid ? 'android' : isIOS ? 'ios' : 'desktop');
  document.querySelectorAll('[data-show]').forEach(function (el) {
    var want = el.getAttribute('data-show').split(' ');
    el.hidden = want.indexOf(root.getAttribute('data-platform')) === -1;
  });

  fetch(cfg.appVersionUrl || '/downloads/version.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
    if (!v) return;
    var safeUrl = typeof v.apk === 'string' && (/^\/[^\/\\]/.test(v.apk) || /^https:\/\//.test(v.apk)) && /\.apk$/.test(v.apk);
    var ok = v.sha256 && safeUrl;
    document.querySelectorAll('[data-v="version"]').forEach(function (e) { e.textContent = v.version || ''; });
    document.querySelectorAll('[data-v="size"]').forEach(function (e) { e.textContent = v.sizeMB ? v.sizeMB + ' MB' : ''; });
    document.querySelectorAll('[data-v="sha256"]').forEach(function (e) { e.textContent = v.sha256 || 'bude doplnené pri vydaní'; });
    document.querySelectorAll('[data-v="minAndroid"]').forEach(function (e) { e.textContent = v.minAndroid || ''; });
    document.querySelectorAll('[data-v="released"]').forEach(function (e) { e.textContent = v.releasedAt ? new Date(v.releasedAt).toLocaleDateString('sk-SK') : ''; });
    var cl = document.querySelector('[data-v="changelog"]');
    if (cl && v.changelog) cl.innerHTML = v.changelog.map(function (x) { return '<li>' + String(x).replace(/[<>&]/g, function (c) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]; }) + '</li>'; }).join('');
    document.querySelectorAll('[data-apk]').forEach(function (a) {
      if (ok) { a.setAttribute('href', v.apk); a.removeAttribute('aria-disabled'); a.textContent = 'Stiahnuť APK ' + v.version; }
      else { a.setAttribute('aria-disabled', 'true'); a.textContent = 'APK zatiaľ nie je zverejnené'; a.addEventListener('click', function (e) { e.preventDefault(); }); }
    });
  }).catch(function () {});
})();
