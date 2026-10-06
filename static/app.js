/* Crypto Channel Agent – frontend (vanilla JS + lightweight-charts) */
const $ = (s) => document.querySelector(s);
const state = { symbol: null, tf: '4h', aiTfs: new Set(['1d', '4h', '1h']), config: null, chartData: null, images: [] };
let chart, candleSeries, lineSeries = [], priceLines = [];

const fmt = (n, d) => n == null ? '–' : Number(n).toLocaleString('sk-SK', { maximumFractionDigits: d ?? (Math.abs(n) >= 100 ? 2 : 4) });
const pct = (n) => n == null ? '–' : (n > 0 ? '+' : '') + Number(n).toFixed(2) + ' %';
const tsLocal = (ms) => ms ? new Date(ms).toLocaleString('sk-SK') : '–';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : r.statusText);
  return data;
}
function setStatus(msg, cls = '') { const el = $('#status'); el.textContent = msg; el.className = 'status ' + cls; }

/* ---------- init ---------- */
async function init() {
  state.config = await api('/api/config');
  renderTfButtons($('#timeframes'), state.config.timeframes, (tf) => { state.tf = tf; loadChart(); }, () => state.tf);
  renderTfButtons($('#aiTfs'), state.config.timeframes, (tf) => { state.aiTfs.has(tf) ? state.aiTfs.delete(tf) : state.aiTfs.add(tf); renderTfButtons($('#aiTfs'), state.config.timeframes, null, null, state.aiTfs); }, null, state.aiTfs);
  $('#chTf').innerHTML = state.config.timeframes.map((t) => `<option ${t === '4h' ? 'selected' : ''}>${t}</option>`).join('');
  await loadWatchlist();
  initChart();
  renderHelp();
  await loadChart();
  setupTabs();
}

function renderTfButtons(el, tfs, onClick, getActive, activeSet) {
  el.innerHTML = '';
  tfs.forEach((tf) => {
    const b = document.createElement('button');
    b.textContent = tf;
    const active = activeSet ? activeSet.has(tf) : getActive && getActive() === tf;
    if (active) b.classList.add('active');
    b.onclick = () => { onClick && onClick(tf); if (!activeSet) renderTfButtons(el, tfs, onClick, getActive); };
    el.appendChild(b);
  });
}

async function loadWatchlist() {
  const list = await api('/api/watchlist');
  const sel = $('#symbol');
  sel.innerHTML = list.map((s) => `<option>${s}</option>`).join('');
  if (!state.symbol || !list.includes(state.symbol)) state.symbol = list[0];
  sel.value = state.symbol;
}
$('#symbol').onchange = (e) => { state.symbol = e.target.value; loadChart(); };
$('#addSymbol').onclick = async () => {
  const s = $('#newSymbol').value.trim().toUpperCase();
  if (!s) return;
  try { await api('/api/watchlist', { method: 'POST', body: JSON.stringify({ symbol: s }) }); $('#newSymbol').value = ''; state.symbol = s; await loadWatchlist(); loadChart(); }
  catch (e) { setStatus('Symbol sa nepodarilo pridať: ' + e.message, 'down'); }
};

/* ---------- chart ---------- */
function initChart() {
  chart = LightweightCharts.createChart($('#chart'), {
    layout: { background: { color: '#0f1419' }, textColor: '#c9d1d9' },
    grid: { vertLines: { color: '#1b232e' }, horzLines: { color: '#1b232e' } },
    timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 8 },
    rightPriceScale: { borderColor: '#263040' },
    crosshair: { mode: 0 },
  });
  candleSeries = chart.addCandlestickSeries({ upColor: '#22c55e', downColor: '#ef4444', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444' });
  new ResizeObserver(() => chart.applyOptions({ width: $('#chart').clientWidth, height: $('#chart').clientHeight })).observe($('#chart'));
}

const COLORS = { user: ['#f59e0b', '#fb923c', '#facc15', '#a3e635'], parallel: '#60a5fa', regression: '#a78bfa' };

async function loadChart() {
  if (!state.symbol) return;
  setStatus('Načítavam ' + state.symbol + ' ' + state.tf + '…');
  try {
    const [data, market] = await Promise.all([
      api(`/api/chart?symbol=${state.symbol}&interval=${state.tf}&limit=300`),
      api(`/api/market/${state.symbol}`).catch(() => null),
    ]);
    state.chartData = data;
    candleSeries.setData(data.candles);
    lineSeries.forEach((s) => chart.removeSeries(s)); lineSeries = [];
    priceLines.forEach((p) => candleSeries.removePriceLine(p)); priceLines = [];
    const legend = [];
    const emaColors = { 20: '#38bdf8', 50: '#f472b6', 200: '#e5e7eb' };
    for (const p of [20, 50, 200]) {
      if (!data.ema[p].length) continue;
      const s = chart.addLineSeries({ color: emaColors[p], lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(data.ema[p]); lineSeries.push(s);
      legend.push(`<span style="color:${emaColors[p]}">EMA ${p}</span>`);
    }
    let ui = 0;
    for (const ch of data.channels) {
      const color = ch.kind === 'user' ? COLORS.user[ui++ % COLORS.user.length] : COLORS[ch.kind];
      const style = ch.kind === 'user' ? 0 : 2;
      for (const key of ['upper', 'lower']) {
        const s = chart.addLineSeries({ color, lineWidth: ch.kind === 'user' ? 2 : 1, lineStyle: style, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(ch[key]); lineSeries.push(s);
      }
      legend.push(`<span style="color:${color}">${esc(ch.name)}${ch.kind !== 'user' ? ' (auto)' : ''}</span>`);
    }
    for (const lv of data.levels) {
      priceLines.push(candleSeries.createPriceLine({ price: lv.price, color: lv.type === 'podpora' ? '#22c55e' : '#ef4444', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: `${lv.type} ×${lv.touches}` }));
    }
    $('#legend').innerHTML = legend.join('') + `<span style="color:#22c55e">podpora</span><span style="color:#ef4444">rezistencia</span>`;
    chart.timeScale().fitContent();
    renderTicker(market, data.provider);
    renderEvals(data.channels);
    setStatus(`${state.symbol} ${state.tf} · dáta: ${data.provider} · ${new Date().toLocaleTimeString('sk-SK')}`);
    refreshSideLists();
  } catch (e) { setStatus('Chyba: ' + e.message, 'down'); }
}

function renderTicker(m, provider) {
  if (!m) { $('#ticker').innerHTML = ''; return; }
  const t = m.ticker || {}, f = m.funding || {}, oi = m.open_interest || {}, ls = m.long_short || {};
  const fundCls = f.funding_rate_pct > 0.03 ? 'warn' : f.funding_rate_pct < -0.03 ? 'warn' : '';
  $('#ticker').innerHTML = `
    <div>Cena <b>${fmt(t.last)}</b> <span class="${t.change_pct_24h >= 0 ? 'up' : 'down'}">${pct(t.change_pct_24h)}</span></div>
    <div>24h H/L <b>${fmt(t.high_24h)}</b> / <b>${fmt(t.low_24h)}</b></div>
    <div>Objem 24h <b>${fmt(t.volume_24h_quote / 1e6, 1)} M</b></div>
    <div>Funding <b class="${fundCls}">${f.funding_rate_pct != null ? f.funding_rate_pct.toFixed(4) + ' %' : '–'}</b></div>
    <div>OI <b>${oi.open_interest != null ? fmt(oi.open_interest, 0) : '–'}</b></div>
    <div>Long/Short <b>${ls.long_short_ratio != null ? ls.long_short_ratio.toFixed(2) : '–'}</b> ${ls.long_account_pct != null ? `(${ls.long_account_pct}% long)` : ''}</div>
    <div class="muted">zdroj: ${provider}</div>`;
}

function renderEvals(channels) {
  $('#evals').innerHTML = channels.map((ch) => {
    const e = ch.eval;
    const posCls = e.position_pct > 80 ? 'down' : e.position_pct < 20 ? 'up' : '';
    return `<div class="card"><h4>${esc(ch.name)} <small>${ch.kind === 'user' ? 'môj' : 'auto'} · ${e.direction}</small></h4>
      <div class="kv">
        <span>Stav</span><span class="${e.status.includes('prerazenie') ? 'warn' : ''}">${esc(e.status)}</span>
        <span>Pozícia v kanáli</span><span class="${posCls}">${e.position_pct != null ? e.position_pct + ' %' : '–'} (0 = spodok)</span>
        <span>Horný / spodný okraj</span><span>${fmt(e.upper_now)} (${pct(e.distance_to_upper_pct)}) / ${fmt(e.lower_now)} (${pct(e.distance_to_lower_pct)})</span>
        <span>Šírka</span><span>${fmt(e.width)} (${fmt(e.width_pct, 2)} %)</span>
        <span>Dotyky hore / dole</span><span>${e.touches_upper} / ${e.touches_lower}</span>
        <span>Close mimo kanála</span><span>${e.closes_above_upper} nad · ${e.closes_below_lower} pod</span>
        <span>Projekcia +5 sviečok</span><span>${fmt(e.projection_5_bars.upper)} / ${fmt(e.projection_5_bars.lower)}</span>
      </div></div>`;
  }).join('');
}

/* ---------- tabs ---------- */
function setupTabs() {
  document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); $('#tab-' + b.dataset.tab).classList.add('active');
    refreshSideLists();
  });
}
function refreshSideLists() { loadChannels(); loadAlerts(); loadHistory(); }

/* ---------- AI ---------- */
$('#images').onchange = async (e) => {
  state.images = [];
  for (const f of [...e.target.files].slice(0, 6)) state.images.push(await fileToDataUrl(f));
  $('#imgPreview').innerHTML = state.images.map((d) => `<img src="${d}">`).join('');
};
const fileToDataUrl = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });

function aiBody() {
  return { symbol: state.symbol, timeframes: state.config.timeframes.filter((t) => state.aiTfs.has(t)), notes: $('#notes').value, images: state.images, include_detected: $('#incDetected').checked, include_alerts: $('#incAlerts').checked };
}
$('#preview').onclick = async () => {
  $('#aiStatus').textContent = 'Zostavujem podklady…';
  try { const s = await api('/api/snapshot', { method: 'POST', body: JSON.stringify(aiBody()) }); $('#snapshot').textContent = JSON.stringify(s, null, 1); $('#snapshot').classList.remove('hidden'); $('#aiStatus').textContent = 'Toto presne dostane AI agent (bez screenshotov).'; }
  catch (e) { $('#aiStatus').textContent = 'Chyba: ' + e.message; }
};
$('#analyze').onclick = async () => {
  if (!state.config.has_api_key) { $('#aiStatus').innerHTML = '<span class="down">Chýba ANTHROPIC_API_KEY v .env – pozri záložku Nastavenie.</span>'; return; }
  const btn = $('#analyze'); btn.disabled = true; $('#snapshot').classList.add('hidden');
  $('#aiStatus').textContent = `Analyzujem ${state.symbol} (${[...state.aiTfs].join(', ')}) modelom ${state.config.ai_model}… môže to trvať 1–3 minúty.`;
  try { const a = await api('/api/analyze', { method: 'POST', body: JSON.stringify(aiBody()) }); renderReport(a); $('#aiStatus').textContent = `Hotovo · ${a.model} · tokeny in/out: ${a.usage?.input_tokens ?? '?'}/${a.usage?.output_tokens ?? '?'}`; loadHistory(); }
  catch (e) { $('#aiStatus').innerHTML = '<span class="down">' + esc(e.message) + '</span>'; }
  finally { btn.disabled = false; }
};

function renderReport(a) {
  const r = a.report;
  const li = (arr, f) => arr.map((x) => `<li>${f(x)}</li>`).join('');
  $('#report').innerHTML = `
    <div class="card"><h4>${esc(r.symbol)} <span class="badge ${r.bias}">${r.bias.toUpperCase()} · ${r.bias_confidence_pct} %</span> <small>${tsLocal(a.created_at)} · ${a.timeframes.join(', ')}</small></h4><p>${esc(r.summary)}</p></div>
    <h3>Kanály</h3><ul>${li(r.channel_assessments, (c) => `<b>${esc(c.channel)}</b> (${esc(c.timeframe)}) – <i>${esc(c.verdict)}</i>: ${esc(c.comment)}`)}</ul>
    <h3>Kľúčové úrovne</h3><ul>${li(r.key_levels, (l) => `<b>${fmt(l.price)}</b> – ${esc(l.type)} (${esc(l.timeframe)}): ${esc(l.why)}`)}</ul>
    <h3>Scenáre</h3>${r.scenarios.map((s) => `<div class="card scenario ${s.direction}"><h4>${esc(s.name)} <span class="badge ${s.direction}">${s.direction}</span> <small>${s.probability_pct} % · RR ${esc(s.risk_reward)}</small></h4>
      <div class="kv"><span>Spúšťač</span><span>${esc(s.trigger)}</span><span>Zóna vstupu</span><span>${esc(s.entry_zone)}</span><span>Invalidácia</span><span>${esc(s.invalidation)}</span><span>Ciele</span><span>${s.targets.map(esc).join(' → ')}</span></div></div>`).join('')}
    <h3>Tipy agenta – čo sledovať</h3><ul>${li(r.watch_tips, (t) => `<span class="badge ${esc(t.priority)}">${esc(t.priority)}</span> <small>${esc(t.category)}</small> ${esc(t.tip)}`)}</ul>
    <h3>Riziká</h3><ul>${li(r.risk_notes, esc)}</ul>
    ${r.data_gaps.length ? `<h3>Chýbajúce / nejasné podklady</h3><ul>${li(r.data_gaps, esc)}</ul>` : ''}
    <p class="muted"><small>${esc(r.disclaimer)}</small></p>`;
}

/* ---------- channels ---------- */
const toMs = (v) => v ? Date.parse(v + 'Z') : null;           // datetime-local chápeme ako UTC
const fromMs = (ms) => ms ? new Date(ms).toISOString().slice(0, 16) : '';
function channelFormData() {
  return { symbol: state.symbol, timeframe: $('#chTf').value, name: $('#chName').value, notes: $('#chNotes').value,
    upper_t1: toMs($('#u1t').value), upper_p1: +$('#u1p').value, upper_t2: toMs($('#u2t').value), upper_p2: +$('#u2p').value,
    lower_t1: toMs($('#l1t').value), lower_p1: +$('#l1p').value, lower_t2: toMs($('#l2t').value), lower_p2: $('#l2p').value ? +$('#l2p').value : null, source: 'tradingview' };
}
$('#channelForm').onsubmit = async (e) => {
  e.preventDefault();
  const id = $('#chId').value, body = channelFormData();
  try {
    if (id) await api('/api/channels/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/channels', { method: 'POST', body: JSON.stringify(body) });
    resetChannelForm(); state.tf = body.timeframe; renderTfButtons($('#timeframes'), state.config.timeframes, (tf) => { state.tf = tf; loadChart(); }, () => state.tf); loadChart();
  } catch (err) { alert('Kanál sa nepodarilo uložiť: ' + err.message); }
};
function resetChannelForm() { $('#channelForm').reset(); $('#chId').value = ''; $('#chName').value = 'Môj kanál'; }
$('#chReset').onclick = resetChannelForm;
$('#chFromAuto').onclick = () => {
  const ch = (state.chartData?.channels || []).find((c) => c.kind === 'parallel') || (state.chartData?.channels || []).find((c) => c.kind === 'regression');
  if (!ch) { alert('Na aktuálnom grafe nie je auto-detegovaný kanál.'); return; }
  const u = ch.upper, l = ch.lower, n = u.length - 16; // posledný reálny bod (bez 15 bodov projekcie)
  $('#chId').value = ''; $('#chName').value = ch.name.replace('Auto ', 'Môj ') ; $('#chTf').value = state.tf;
  $('#u1t').value = fromMs(u[0].time * 1000); $('#u1p').value = u[0].value; $('#u2t').value = fromMs(u[n].time * 1000); $('#u2p').value = u[n].value;
  $('#l1t').value = fromMs(l[0].time * 1000); $('#l1p').value = l[0].value; $('#l2t').value = fromMs(l[n].time * 1000); $('#l2p').value = l[n].value;
};
async function loadChannels() {
  const list = await api('/api/channels?symbol=' + state.symbol).catch(() => []);
  $('#channelList').innerHTML = list.length ? list.map((c) => `<div class="card"><h4>${esc(c.name)} <small>${c.timeframe} · ${c.active ? 'aktívny' : 'vypnutý'} · ${esc(c.source)}</small></h4>
    <div class="kv"><span>Horná</span><span>${fromMs(c.upper_t1).replace('T', ' ')} @ ${fmt(c.upper_p1)} → ${fromMs(c.upper_t2).replace('T', ' ')} @ ${fmt(c.upper_p2)}</span>
    <span>Spodná</span><span>${fromMs(c.lower_t1).replace('T', ' ')} @ ${fmt(c.lower_p1)}${c.lower_t2 ? ` → ${fromMs(c.lower_t2).replace('T', ' ')} @ ${fmt(c.lower_p2)}` : ' (rovnobežka)'}</span>
    ${c.notes ? `<span>Poznámka</span><span>${esc(c.notes)}</span>` : ''}</div>
    <div class="actions"><button data-edit="${c.id}">Upraviť</button><button data-toggle="${c.id}" data-active="${c.active}">${c.active ? 'Vypnúť' : 'Zapnúť'}</button><button data-del="${c.id}">Zmazať</button></div></div>`).join('')
    : '<p class="muted">Pre tento symbol zatiaľ nemáš žiadny kanál.</p>';
  $('#channelList').querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
    const c = list.find((x) => x.id == b.dataset.edit);
    $('#chId').value = c.id; $('#chName').value = c.name; $('#chTf').value = c.timeframe; $('#chNotes').value = c.notes || '';
    $('#u1t').value = fromMs(c.upper_t1); $('#u1p').value = c.upper_p1; $('#u2t').value = fromMs(c.upper_t2); $('#u2p').value = c.upper_p2;
    $('#l1t').value = fromMs(c.lower_t1); $('#l1p').value = c.lower_p1; $('#l2t').value = fromMs(c.lower_t2); $('#l2p').value = c.lower_p2 ?? '';
    window.scrollTo(0, 0);
  });
  $('#channelList').querySelectorAll('[data-toggle]').forEach((b) => b.onclick = async () => { await api('/api/channels/' + b.dataset.toggle, { method: 'PUT', body: JSON.stringify({ active: b.dataset.active === '1' ? 0 : 1 }) }); loadChart(); });
  $('#channelList').querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (confirm('Zmazať kanál?')) { await api('/api/channels/' + b.dataset.del, { method: 'DELETE' }); loadChart(); } });
}

/* ---------- alerts & history ---------- */
async function loadAlerts() {
  const list = await api('/api/alerts?symbol=' + state.symbol + '&limit=50').catch(() => []);
  $('#alertList').innerHTML = list.length ? list.map((a) => `<div class="card"><h4>${a.source === 'tradingview' ? '📈 TradingView' : '📐 Monitor'} · ${esc(a.event)} <small>${tsLocal(a.received_at)} · ${a.timeframe || ''} ${a.price ? '@ ' + fmt(a.price) : ''}</small></h4><div>${esc(a.message)}</div></div>`).join('') : '<p class="muted">Žiadne alerty pre tento symbol.</p>';
}
$('#refreshAlerts').onclick = loadAlerts;
$('#runMonitor').onclick = async () => { const created = await api('/api/monitor/run', { method: 'POST' }); setStatus(`Monitor: ${created.length} nových upozornení`); loadAlerts(); };

async function loadHistory() {
  const list = await api('/api/analyses?symbol=' + state.symbol + '&limit=20').catch(() => []);
  $('#historyList').innerHTML = list.length ? list.map((a) => `<div class="card"><h4>${tsLocal(a.created_at)} <span class="badge ${a.report.bias}">${a.report.bias} ${a.report.bias_confidence_pct} %</span> <small>${a.timeframes.join(', ')}</small></h4><div>${esc(a.report.summary)}</div><div class="actions"><button data-show="${a.id}">Zobraziť celú</button></div></div>`).join('') : '<p class="muted">Zatiaľ žiadne analýzy.</p>';
  $('#historyList').querySelectorAll('[data-show]').forEach((b) => b.onclick = () => { renderReport(list.find((x) => x.id == b.dataset.show)); document.querySelector('[data-tab="ai"]').click(); });
}

/* ---------- help ---------- */
function renderHelp() {
  const c = state.config;
  const origin = location.origin;
  $('#helpBox').innerHTML = `<div class="helpbox">
    <div class="card"><h4>Stav</h4><div class="kv">
      <span>Claude API kľúč</span><span class="${c.has_api_key ? 'up' : 'down'}">${c.has_api_key ? 'nastavený' : 'CHÝBA – doplň ANTHROPIC_API_KEY do .env a reštartuj'}</span>
      <span>Model / effort</span><span>${c.ai_model} / ${c.ai_effort}</span>
      <span>Trhové dáta</span><span>${c.provider_mode} (naposledy: ${c.provider_last || '–'})</span>
      <span>Monitor kanálov</span><span>${c.monitor_interval_seconds > 0 ? `každých ${c.monitor_interval_seconds} s, prah ${c.monitor_proximity_pct} %` : 'vypnutý'}</span>
      <span>Telegram</span><span>${c.telegram ? 'zapnutý' : 'vypnutý'}</span>
      <span>Webhook secret</span><span class="${c.webhook_secret_set ? 'up' : 'warn'}">${c.webhook_secret_set ? 'nastavený' : 'nenastavený (webhook prijme čokoľvek!)'}</span>
    </div></div>
    <div class="card"><h4>TradingView → webhook</h4>
      <p>1. V TradingView vytvor alert (napr. na dotyk čiary kanála). 2. V záložke <b>Notifications</b> zapni <b>Webhook URL</b>:</p>
      <pre>${origin}/api/tradingview/webhook</pre>
      <p>3. Do <b>Message</b> vlož (doplň svoj secret a názov udalosti):</p>
      <pre>${esc(c.tv_alert_template)}</pre>
      <p class="muted">TradingView webhooky vyžadujú verejne dostupnú HTTPS adresu (port 80/443). Lokálne beží aplikácia na localhost – použi tunel (napr. <code>cloudflared tunnel --url http://localhost:${location.port || 80}</code> alebo ngrok) alebo ju nasaď na VPS.</p>
    </div>
    <div class="card"><h4>Ako zadať kanál z TradingView</h4>
      <ol><li>V TradingView dvojklikni na nakreslený kanál → záložka <b>Súradnice (Coordinates)</b>.</li>
      <li>Opíš cenu a čas bodov 1 a 2 hornej čiary a bodu spodnej čiary (TradingView ukazuje čas v časovej zóne grafu – prepni graf na UTC, alebo prepočítaj).</li>
      <li>V záložke <b>Kanály</b> ich zadaj a ulož. Kanál sa vykreslí na grafe, monitor ho sleduje a AI ho dostane v analýze.</li></ol>
    </div>
  </div>`;
}

init().catch((e) => setStatus('Chyba inicializácie: ' + e.message, 'down'));
