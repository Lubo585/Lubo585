/* NazovPortalu – klientská logika (bez závislostí) */
(function () {
  'use strict';

  /* ---------- Brána 18+ ---------- */
  var gate = document.getElementById('age-gate');
  if (gate) {
    var KEY = 'np_age_ok';
    var ok = false;
    try { ok = localStorage.getItem(KEY) === '1'; } catch (e) {}
    if (ok) { gate.hidden = true; } else { document.body.classList.add('locked'); }
    var yes = document.getElementById('age-yes');
    var no = document.getElementById('age-no');
    if (yes) yes.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      gate.hidden = true; document.body.classList.remove('locked');
    });
    if (no) no.addEventListener('click', function () { location.href = 'https://www.google.com'; });
  }

  /* ---------- Mobilné menu ---------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('mobile-menu');
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.getAttribute('aria-hidden') === 'false';
      menu.setAttribute('aria-hidden', open ? 'true' : 'false');
      burger.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  /* ---------- Filtre (chips) ---------- */
  document.querySelectorAll('.chip[data-filter]').forEach(function (chip) {
    chip.addEventListener('click', function (ev) {
      ev.preventDefault();
      chip.classList.toggle('is-active');
      applyFilters();
    });
  });
  var form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', function (ev) { ev.preventDefault(); applyFilters(); });
    form.addEventListener('change', applyFilters);
  }
  function applyFilters() {
    var cards = document.querySelectorAll('.listing[data-city]');
    if (!cards.length) return;
    var city = (document.getElementById('f-city') || {}).value || '';
    var cat = (document.getElementById('f-cat') || {}).value || '';
    var q = ((document.getElementById('f-q') || {}).value || '').toLowerCase().trim();
    var tags = [].map.call(document.querySelectorAll('.chip.is-active'), function (c) { return c.dataset.filter; });
    var shown = 0;
    cards.forEach(function (c) {
      var okCity = !city || c.dataset.city === city;
      var okCat = !cat || c.dataset.cat === cat;
      var okQ = !q || c.textContent.toLowerCase().indexOf(q) !== -1;
      var ctags = (c.dataset.tags || '').split(' ');
      var okTags = tags.every(function (t) { return ctags.indexOf(t) !== -1; });
      var show = okCity && okCat && okQ && okTags;
      c.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    var cnt = document.getElementById('result-count');
    if (cnt) cnt.textContent = shown + ' ' + (shown === 1 ? 'inzerát' : (shown >= 2 && shown <= 4 ? 'inzeráty' : 'inzerátov'));
  }

  /* ---------- Skryté telefónne číslo (ochrana inzerentov) ---------- */
  document.querySelectorAll('[data-phone]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = btn.dataset.phone;
      btn.textContent = p; btn.setAttribute('href', 'tel:' + p.replace(/\s/g, ''));
      btn.removeAttribute('data-phone');
    });
  });

  /* ---------- Aktuálny rok v pätičke ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
