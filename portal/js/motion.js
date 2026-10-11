/* NazovPortalu – pohyb: vstup pri scrollovaní, prechody stránok, ripple, hlavička, počítadlá, toast */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.np = window.np || {};

  /* ---------- Toast (používa aj supabase.js namiesto alert) ---------- */
  var toastEl;
  window.np.toast = function (msg, ms) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, ms || 2600);
  };

  if (reduce) return;   /* nižšie už len vizuálny pohyb */

  /* ---------- Vstup pri scrollovaní ---------- */
  var sections = document.querySelectorAll('main .section, main .hero + .section');
  sections.forEach(function (s, i) {
    var head = s.querySelector('.section-head, h1, h2'); if (head && !head.classList.contains('reveal')) head.classList.add('reveal');
    s.querySelectorAll('.grid, .features, .steps, .cities, .faq, .cta, .seo-text, .detail, .prose').forEach(function (g) {
      if (g.children.length > 1 && g.matches('.grid, .features, .steps')) g.classList.add('reveal-stagger'); else g.classList.add('reveal');
    });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { io.observe(el); });
  /* prvky už vo výreze pri načítaní nech nezablikajú */
  requestAnimationFrame(function () { document.querySelectorAll('.reveal, .reveal-stagger').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.9) el.classList.add('is-in'); }); });

  /* ---------- Nové karty po filtrovaní ---------- */
  var grids = document.querySelectorAll('[data-listings]');
  grids.forEach(function (g) {
    new MutationObserver(function () { g.classList.remove('is-refreshing'); void g.offsetWidth; g.classList.add('is-refreshing'); }).observe(g, { childList: true });
  });

  /* ---------- Ripple na tlačidlách ---------- */
  document.addEventListener('pointerdown', function (ev) {
    var b = ev.target.closest('.btn'); if (!b) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.2;
    var s = document.createElement('span'); s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (ev.clientX - r.left - d / 2) + 'px;top:' + (ev.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 600);
  }, { passive: true });

  /* ---------- Hlavička: tieň pri scrolle, skrytie pri scrolle nadol na mobile ---------- */
  var header = document.querySelector('.header'), lastY = 0, ticking = false;
  if (header) window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = scrollY; header.classList.toggle('is-scrolled', y > 8);
      if (innerWidth < 900) header.classList.toggle('is-hidden', y > lastY && y > 120 && !(document.getElementById('mobile-menu') || {}).matches?.('[aria-hidden="false"]'));
      lastY = y; ticking = false;
    });
  }, { passive: true });

  /* ---------- Brána 18+: plynulé zatvorenie ---------- */
  var gate = document.getElementById('age-gate'), yes = document.getElementById('age-yes');
  if (gate && yes) yes.addEventListener('click', function () {
    gate.hidden = false; gate.classList.add('is-closing');
    setTimeout(function () { gate.hidden = true; gate.classList.remove('is-closing'); }, 320);
  });

  /* ---------- Počítadlá v kategóriách ---------- */
  document.querySelectorAll('.cat small').forEach(function (el) {
    var m = /^([\d\s]*\d)\s*(.*)$/.exec(el.textContent.trim()); if (!m) return;
    var target = parseInt(m[1].replace(/\s/g, ''), 10), suffix = ' ' + m[2]; if (!target) return;
    el.setAttribute('data-count', target);
    var done = false;
    new IntersectionObserver(function (en, obs) {
      if (!en[0].isIntersecting || done) return; done = true; obs.disconnect();
      var t0 = performance.now(), dur = 900;
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e).toLocaleString('sk-SK') + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: .5 }).observe(el);
  });

  /* ---------- Prechody medzi stránkami (fallback bez View Transitions) ---------- */
  if (!('startViewTransition' in document)) document.addEventListener('click', function (ev) {
    var a = ev.target.closest('a[href]'); if (!a || ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname || /^(tel|mailto):/.test(a.href)) return;
    ev.preventDefault(); document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = u.href; }, 170);
  });
  window.addEventListener('pageshow', function () { document.body.classList.remove('is-leaving'); });

  /* ---------- Spodná lišta: aktívna položka ---------- */
  document.querySelectorAll('.bottom-bar a').forEach(function (a) {
    var p = a.getAttribute('href'); if (p === location.pathname || (p === '/' && /^\/(index\.html)?$/.test(location.pathname))) a.setAttribute('aria-current', 'page');
  });
})();
