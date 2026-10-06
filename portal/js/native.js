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
      try { var u = new URL(ev.url); if (u.pathname && u.pathname !== location.pathname) location.href = u.pathname + u.search; } catch (e) {}
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
        if (d && d.url) location.href = d.url;
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
