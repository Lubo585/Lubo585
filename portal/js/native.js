/* NazovPortalu – natívna vrstva (Capacitor). Na webe je neškodná: len nastaví úložisko relácie.
   Načítava sa PRED supabase.js. */
(function () {
  'use strict';
  var C = window.Capacitor;
  var isNative = !!(C && C.isNativePlatform && C.isNativePlatform());
  var P = (C && C.Plugins) || {};
  window.np = window.np || {};
  window.np.isNative = isNative;
  window.np.platform = isNative ? C.getPlatform() : 'web';

  /* Úložisko prihlásenia: v aplikácii Capacitor Preferences (prežije aktualizácie appky), na webe localStorage */
  if (isNative && P.Preferences) {
    window.np.storage = {
      getItem: function (k) { return P.Preferences.get({ key: k }).then(function (r) { return r.value; }); },
      setItem: function (k, v) { return P.Preferences.set({ key: k, value: v }); },
      removeItem: function (k) { return P.Preferences.remove({ key: k }); }
    };
  } else {
    window.np.storage = {
      getItem: function (k) { try { return Promise.resolve(localStorage.getItem(k)); } catch (e) { return Promise.resolve(null); } },
      setItem: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} return Promise.resolve(); },
      removeItem: function (k) { try { localStorage.removeItem(k); } catch (e) {} return Promise.resolve(); }
    };
  }

  if (!isNative) return;
  document.documentElement.setAttribute('data-native', '1');

  /* Stavová lišta a splash */
  if (P.StatusBar) { P.StatusBar.setStyle({ style: 'DARK' }).catch(function () {}); P.StatusBar.setBackgroundColor && P.StatusBar.setBackgroundColor({ color: '#0f0a0d' }).catch(function () {}); }
  if (P.SplashScreen) setTimeout(function () { P.SplashScreen.hide().catch(function () {}); }, 300);

  /* Hardvérové tlačidlo späť (Android) */
  if (P.App) {
    P.App.addListener('backButton', function (ev) {
      var menu = document.getElementById('mobile-menu');
      if (menu && menu.getAttribute('aria-hidden') === 'false') { menu.setAttribute('aria-hidden', 'true'); return; }
      if (ev.canGoBack) history.back(); else P.App.exitApp();
    });
    /* Deep linky: https://nazovportalu.sk/inzerat/slug -> otvorí rovnakú cestu v appke */
    P.App.addListener('appUrlOpen', function (ev) {
      try {
        var u = new URL(ev.url); var path = u.pathname.replace(/^\/+/, '/');
        if (/^\/(?!\/)/.test(path) && path !== location.pathname) location.href = path + u.search;   // len cesta v rámci aplikácie, nikdy cudzí host
      } catch (e) {}
    });
  }

  /* Push notifikácie: token sa uloží do device_tokens po prihlásení (volá supabase.js cez np.registerPush) */
  window.np.registerPush = function (sb, userId) {
    if (!P.PushNotifications) return;
    P.PushNotifications.requestPermissions().then(function (r) {
      if (r.receive !== 'granted') return;
      P.PushNotifications.addListener('registration', function (t) {
        sb.from('device_tokens').upsert({ user_id: userId, token: t.value, platform: window.np.platform, app_version: window.NP_APP_VERSION || null, last_seen_at: new Date().toISOString() }, { onConflict: 'token' });
      });
      P.PushNotifications.addListener('pushNotificationActionPerformed', function (n) {
        var d = n.notification && n.notification.data;
        if (d && typeof d.url === 'string' && /^\/(?!\/)/.test(d.url)) location.href = d.url;   // len relatívna cesta
      });
      P.PushNotifications.register();
    }).catch(function () {});
  };

  /* Natívne zdieľanie inzerátu */
  window.np.share = function (title, url) {
    if (P.Share) return P.Share.share({ title: title, url: url });
    if (navigator.share) return navigator.share({ title: title, url: url });
  };
})();

/* ---------- Kontrola aktualizácií pri priamej distribúcii (Android APK) ---------- */
(function () {
  var C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform()) || C.getPlatform() !== 'android') return;
  var cfg = window.NP_CONFIG || {};
  var url = (cfg.siteUrl || '') + (cfg.appVersionUrl || '/downloads/version.json');
  function cmp(a, b) { var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }
  function check() {
    fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
      if (!v || !v.version || !window.NP_APP_VERSION || cmp(v.version, window.NP_APP_VERSION) <= 0 || !v.apk) return;
      if (!(typeof v.apk === 'string' && (/^\/[^\/\\]/.test(v.apk) || /^https:\/\//.test(v.apk)) && /\.apk$/.test(v.apk))) return;
      if (document.getElementById('np-update')) return;
      var bar = document.createElement('div'); bar.id = 'np-update';
      bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:60;background:#1a1216;border:1px solid #d4af37;border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:center;font-size:.9rem;box-shadow:0 10px 30px rgba(0,0,0,.4)';
      bar.innerHTML = '<span style="flex:1">Nová verzia aplikácie <b>' + String(v.version).replace(/[^0-9.]/g, '') + '</b> je k dispozícii. Inštalácia cez nový APK zachová vaše prihlásenie aj dáta.</span>' +
        '<a class="btn btn-gold btn-sm" href="#" id="np-update-go">Stiahnuť</a><button class="btn btn-ghost btn-sm" id="np-update-x" aria-label="Zavrieť">✕</button>';
      document.body.appendChild(bar);
      var apk = /^https?:/.test(v.apk) ? v.apk : (cfg.siteUrl || '') + v.apk;
      document.getElementById('np-update-go').addEventListener('click', function (e) {
        e.preventDefault();
        var P = C.Plugins || {};
        if (P.Browser) P.Browser.open({ url: apk }); else window.open(apk, '_system');
      });
      document.getElementById('np-update-x').addEventListener('click', function () { bar.remove(); });
    }).catch(function () {});
  }
  setTimeout(check, 2500);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
