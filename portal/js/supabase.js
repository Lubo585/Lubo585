/* NazovPortalu – napojenie na Supabase (progresívne: bez konfigurácie ostáva demo obsah) */
(function () {
  'use strict';
  var cfg = window.NP_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) return;
  window.np = window.np || {};
  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { storage: window.np.storage || undefined, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    global: { headers: { 'x-np-client': (window.np.platform || 'web') + '/' + (window.NP_APP_VERSION || 'web') } }
  });
  window.np.sb = sb;

  /* ---------- Konfigurácia aplikácie: údržba, oznam, minimálna verzia (web aj mobil) ---------- */
  sb.from('app_config').select('key,value').then(function (r) {
    if (r.error || !r.data) return;
    var c = {}; r.data.forEach(function (x) { c[x.key] = x.value; });
    var bar = document.createElement('div');
    bar.style.cssText = 'background:#3b2a00;color:#ffd77a;padding:10px 16px;text-align:center;font-size:.92rem';
    if (c.maintenance && c.maintenance.enabled) { bar.textContent = c.maintenance.message || 'Prebieha údržba, niektoré funkcie môžu byť dočasne nedostupné.'; document.body.prepend(bar); }
    else if (c.announcement && c.announcement.enabled) { bar.textContent = (c.announcement.title ? c.announcement.title + ': ' : '') + c.announcement.body; document.body.prepend(bar); }
    var v = window.NP_APP_VERSION, min = c.min_app_version && c.min_app_version[window.np.platform];
    if (v && min && cmpVer(v, min) < 0) {
      var up = document.createElement('div');
      up.className = 'age-gate'; up.innerHTML = '<div class="age-box"><h2>Aktualizujte aplikáciu</h2><p>Táto verzia (' + v + ') už nie je podporovaná. Stiahnite si novú verziu z obchodu. Vaše dáta zostanú zachované.</p></div>';
      document.body.appendChild(up);
    }
  });
  function cmpVer(a, b) { var x = a.split('.').map(Number), y = b.split('.').map(Number); for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; }
  sb.auth.onAuthStateChange(function (ev, session) {
    if (session && window.np.registerPush) window.np.registerPush(sb, session.user.id);
    document.querySelectorAll('[data-auth-only]').forEach(function (el) { el.hidden = !session; });
    document.querySelectorAll('[data-anon-only]').forEach(function (el) { el.hidden = !!session; });
  });

  /* ---------- Pomocné ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function photoUrl(path) { return path ? sb.storage.from(cfg.photoBucket).getPublicUrl(path).data.publicUrl : ''; }
  function plural(n) { return n + ' ' + (n === 1 ? 'inzerát' : (n >= 2 && n <= 4 ? 'inzeráty' : 'inzerátov')); }
  function stars(avg, cnt) {
    if (!cnt) return '<span class="stars">Zatiaľ bez recenzií</span>';
    var full = Math.round(avg); return '<span class="stars">' + '★'.repeat(full) + '☆'.repeat(5 - full) + ' <span class="muted">(' + cnt + ')</span></span>';
  }
  function card(l) {
    var badges = '';
    if (l.is_verified) badges += '<span class="badge ok">✓ Overené</span>';
    if (l.is_top) badges += '<span class="badge gold">TOP</span>';
    if (l.is_online) badges += '<span class="badge online">Online</span>';
    if (l.photo_count > 0 && !l.cover_path) badges += '';
    var place = l.parent_city_name ? l.parent_city_name + ' – ' + l.city_name : l.city_name;
    var photo = l.cover_path ? '<img src="' + esc(photoUrl(l.cover_path)) + '" alt="' + esc(l.title) + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">' : '<div class="blur"></div>♥';
    return '<a class="listing" href="/inzerat/' + esc(l.slug) + '" data-id="' + esc(l.id) + '">' +
      '<div class="photo">' + photo + '<div class="badges">' + badges + '</div></div>' +
      '<div class="body"><div class="title"><span>' + esc(l.title) + '</span><span class="price">' + (l.price_from != null ? 'od ' + Number(l.price_from).toFixed(0) + ' €' : 'dohodou') + '</span></div>' +
      '<div class="meta"><span>' + esc(place) + '</span>' + stars(l.rating_avg, l.rating_count) + '</div></div></a>';
  }

  /* ---------- Výpis inzerátov (index, mesto) ---------- */
  var grid = document.querySelector('[data-listings]');
  if (grid) {
    var params = new URLSearchParams(location.search);
    function currentFilters() {
      var tags = [].map.call(document.querySelectorAll('.chip.is-active[data-filter]'), function (c) { return c.dataset.filter; });
      return {
        p_city: (document.getElementById('f-city') || {}).value || grid.dataset.city || params.get('mesto') || null,
        p_category: (document.getElementById('f-cat') || {}).value || grid.dataset.category || params.get('kategoria') || null,
        p_q: (document.getElementById('f-q') || {}).value || params.get('q') || null,
        p_verified: tags.indexOf('overene') !== -1,
        p_online: tags.indexOf('online') !== -1,
        p_with_reviews: tags.indexOf('recenzie') !== -1,
        p_limit: Number(grid.dataset.limit || 24), p_offset: 0
      };
    }
    function load() {
      grid.setAttribute('aria-busy', 'true');
      sb.rpc('search_listings', currentFilters()).then(function (r) {
        grid.removeAttribute('aria-busy');
        if (r.error) { console.error(r.error); return; }
        grid.innerHTML = r.data.length ? r.data.map(card).join('') : '<p class="muted">Žiadne inzeráty nezodpovedajú filtru.</p>';
        var cnt = document.getElementById('result-count'); if (cnt) cnt.textContent = plural(r.data.length);
      });
    }
    load();
    var form = document.getElementById('search-form');
    if (form) { form.addEventListener('submit', function (e) { e.preventDefault(); load(); }); form.addEventListener('change', load); }
    document.querySelectorAll('.chip[data-filter]').forEach(function (c) { c.addEventListener('click', function () { setTimeout(load, 0); }); });
  }

  /* ---------- Detail inzerátu ---------- */
  var detail = document.querySelector('[data-listing-detail]');
  if (detail) {
    var slug = detail.dataset.slug || location.pathname.split('/').filter(Boolean).pop();
    sb.from('public_listings').select('*').eq('slug', slug).maybeSingle().then(function (r) {
      if (r.error || !r.data) return;
      var l = r.data;
      document.title = l.title + ' – ' + (l.is_verified ? 'overená ' : '') + l.category_name.toLowerCase() + ' ' + (l.parent_city_name || l.city_name) + ' | ' + (cfg.siteName || document.title.split('|').pop().trim());
      var h1 = detail.querySelector('h1'); if (h1) h1.textContent = l.title;
      var body = detail.querySelector('[data-field="body"]'); if (body) body.textContent = l.body;
      var g = detail.querySelector('.gallery');
      if (g && l.cover_path) g.innerHTML = '<div class="photo"><img src="' + esc(photoUrl(l.cover_path)) + '" alt="' + esc(l.title) + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px"></div>';
      sb.rpc('bump_views', { p_listing: l.id });
      var btn = detail.querySelector('[data-phone], [data-reveal]');
      if (btn) {
        btn.removeAttribute('data-phone'); btn.setAttribute('data-reveal', l.id);
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          sb.rpc('reveal_phone', { p_listing: l.id }).then(function (p) {
            if (p.error) { btn.textContent = p.error.message; return; }
            btn.textContent = p.data; btn.setAttribute('href', 'tel:' + String(p.data).replace(/\s/g, ''));
          });
        }, { once: true });
      }
      var msg = detail.querySelector('[data-message]');
      if (msg) msg.addEventListener('click', function (e) {
        e.preventDefault();
        sb.auth.getSession().then(function (r) {
          if (!r.data.session) { location.href = '/ucet/?next=' + encodeURIComponent(location.pathname); return; }
          var body = prompt('Vaša správa pre ' + l.title + ' (diskrétne, cez portál):');
          if (!body) return;
          sb.rpc('start_conversation', { p_listing: l.id, p_body: body }).then(function (x) {
            if (x.error) { alert('Chyba: ' + x.error.message); return; }
            location.href = '/spravy.html?k=' + x.data;
          });
        });
      });
      var sh = detail.querySelector('[data-share]');
      if (sh) sh.addEventListener('click', function (e) { e.preventDefault(); if (window.np.share) window.np.share(l.title, cfg.siteUrl + '/inzerat/' + l.slug); });
      var rep = detail.querySelector('[data-report]');
      if (rep) rep.addEventListener('click', function (e) {
        e.preventDefault();
        var reason = prompt('Dôvod nahlásenia: fake_photos, underage, coercion, scam, duplicate, offensive, other', 'fake_photos');
        if (!reason) return;
        var details = prompt('Podrobnosti (nepovinné)') || null;
        sb.rpc('submit_report', { p_listing: l.id, p_reason: reason, p_details: details }).then(function (x) {
          alert(x.error ? 'Chyba: ' + x.error.message : 'Ďakujeme, nahlásenie sme prijali a preveríme ho do 24 hodín.');
        });
      });
    });
  }

  /* ---------- Pridanie inzerátu ---------- */
  var addForm = document.querySelector('form[data-add-listing]');
  if (addForm) {
    addForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = addForm, out = f.querySelector('[data-status]') || f;
      function say(m) { if (out !== f) { out.hidden = false; out.textContent = m; } else alert(m); }
      try {
        var email = f.email.value, phone = f.tel.value, dob = f.dob.value;
        var session = (await sb.auth.getSession()).data.session;
        if (!session) {
          var otp = await sb.auth.signInWithOtp({ email: email, options: { data: { date_of_birth: dob, phone: phone, display_name: f.title.value.split(',')[0] }, emailRedirectTo: location.href } });
          if (otp.error) throw otp.error;
          say('Poslali sme vám prihlasovací odkaz na ' + email + '. Po kliknutí sa vráťte sem a odošlite formulár znova.');
          return;
        }
        var cat = await sb.from('categories').select('id').eq('name', f.kategoria.value).single();
        var cityQ = await sb.from('cities').select('id').ilike('name', '%' + f.mesto.value.split('–').pop().trim() + '%').limit(1).maybeSingle();
        if (!cityQ.data) throw new Error('Mesto sa nenašlo. Zadajte napr. „Bratislava – Ružinov“ alebo „Košice“.');
        var ins = await sb.from('listings').insert({
          owner_id: session.user.id, category_id: cat.data.id, city_id: cityQ.data.id,
          title: f.title.value, body: f.text.value, price_from: f.cena.value || null,
          contact_phone: phone, blur_faces: !!f.blur.checked, status: 'pending'
        }).select('id').single();
        if (ins.error) throw ins.error;
        var files = f.fotky.files;
        for (var i = 0; i < files.length && i < 10; i++) {
          var path = ins.data.id + '/' + Date.now() + '-' + i + '.' + (files[i].name.split('.').pop() || 'jpg');
          var up = await sb.storage.from(cfg.uploadBucket || 'listing-uploads').upload(path, files[i], { contentType: files[i].type });
          if (!up.error) await sb.from('listing_photos').insert({ listing_id: ins.data.id, storage_path: path, sort: i, is_cover: i === 0 });
        }
        var ver = await sb.from('verifications').insert({ listing_id: ins.data.id }).select('code').single();
        say('Inzerát je uložený a čaká na kontrolu. Váš overovací kód je ' + (ver.data ? ver.data.code : '—') + '. Nahrajte krátke selfie video s týmto kódom vo svojom účte.');
        f.reset();
      } catch (err) { say('Chyba: ' + (err.message || err)); }
    });
  }

  /* ---------- Správy: zoznam konverzácií + vlákno v reálnom čase ---------- */
  var inbox = document.querySelector('[data-inbox]');
  if (inbox) {
    var list = inbox.querySelector('[data-conv-list]'), thread = inbox.querySelector('[data-thread]'), msgs = inbox.querySelector('[data-messages]'), form = inbox.querySelector('form[data-send]');
    var me = null, current = new URLSearchParams(location.search).get('k'), channel = null;
    sb.auth.getSession().then(function (r) {
      if (!r.data.session) { inbox.innerHTML = '<p class="notice">Na čítanie správ sa <a href="/ucet/?next=/spravy.html">prihláste</a>.</p>'; return; }
      me = r.data.session.user.id; loadConvs();
      sb.channel('inbox-' + me).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, loadConvs).subscribe();
    });
    function loadConvs() {
      sb.from('conversations').select('id,listing_id,client_id,advertiser_id,last_message_at,client_unread,advertiser_unread,blocked_by,listings:listing_id(title,slug)').order('last_message_at', { ascending: false }).then(function (r) {
        if (r.error) return;
        list.innerHTML = r.data.length ? r.data.map(function (c) {
          var unread = c.client_id === me ? c.client_unread : c.advertiser_unread;
          var who = c.client_id === me ? 'Inzerát: ' + esc(c.listings ? c.listings.title : '') : 'Klient k inzerátu ' + esc(c.listings ? c.listings.title : '');
          return '<a class="cat" href="?k=' + c.id + '" data-conv="' + c.id + '"' + (c.id === current ? ' aria-current="true"' : '') + '><strong>' + who + (unread ? ' <span class="badge gold">' + unread + '</span>' : '') + '</strong><small>' + new Date(c.last_message_at).toLocaleString('sk-SK') + (c.blocked_by ? ' · zablokované' : '') + '</small></a>';
        }).join('') : '<p class="muted">Zatiaľ žiadne správy.</p>';
        list.querySelectorAll('[data-conv]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openConv(a.dataset.conv); }); });
        if (current) openConv(current);
      });
    }
    function render(m) { return '<div class="review" style="text-align:' + (m.sender_id === me ? 'right' : 'left') + '"><p style="display:inline-block;max-width:80%;margin:0;padding:8px 12px;border-radius:12px;background:' + (m.sender_id === me ? 'var(--accent)' : 'var(--card-2)') + '">' + esc(m.body) + '</p><br><small class="muted">' + new Date(m.created_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) + (m.sender_id === me && m.read_at ? ' · prečítané' : '') + '</small></div>'; }
    function openConv(id) {
      current = id; history.replaceState(null, '', '?k=' + id); thread.hidden = false;
      sb.from('messages').select('*').eq('conversation_id', id).order('created_at').then(function (r) {
        if (r.error) return; msgs.innerHTML = r.data.map(render).join(''); msgs.scrollTop = msgs.scrollHeight; sb.rpc('mark_read', { p_conversation: id });
      });
      if (channel) sb.removeChannel(channel);
      channel = sb.channel('conv-' + id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + id }, function (p) {
        msgs.insertAdjacentHTML('beforeend', render(p.new)); msgs.scrollTop = msgs.scrollHeight; if (p.new.sender_id !== me) sb.rpc('mark_read', { p_conversation: id });
      }).subscribe();
    }
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault(); var inp = form.querySelector('input,textarea'); var body = inp.value.trim(); if (!body || !current) return;
      sb.from('messages').insert({ conversation_id: current, sender_id: me, body: body }).then(function (r) { if (r.error) alert('Chyba: ' + r.error.message); else inp.value = ''; });
    });
    var blk = inbox.querySelector('[data-block]');
    if (blk) blk.addEventListener('click', function (e) { e.preventDefault(); if (current && confirm('Zablokovať túto konverzáciu?')) sb.rpc('block_conversation', { p_conversation: current }).then(loadConvs); });
  }

  /* ---------- Heartbeat „som online“ pre prihlásenú inzerentku ---------- */
  sb.auth.getSession().then(function (r) {
    if (!r.data.session) return;
    sb.from('listings').select('id').eq('owner_id', r.data.session.user.id).eq('status', 'active').then(function (q) {
      if (!q.data || !q.data.length) return;
      function beat() { q.data.forEach(function (l) { sb.rpc('heartbeat', { p_listing: l.id }); }); }
      beat(); setInterval(beat, 5 * 60 * 1000);
    });
  });
})();
