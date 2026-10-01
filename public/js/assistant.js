// AI asistent – spoločný skript pre stránku /assistant a plávajúci panel
function aiEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// minimálny markdown: odkazy, tučné, zoznamy, nové riadky
function aiMd(t) {
  let h = aiEsc(t);
  h = h.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = h.split('\n'); let out = ''; let inList = null;
  for (const l of lines) {
    const m = l.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
    if (m) { const type = /\d/.test(m[1]) ? 'ol' : 'ul'; if (inList !== type) { if (inList) out += `</${inList}>`; out += `<${type}>`; inList = type; } out += `<li>${m[2]}</li>`; }
    else { if (inList) { out += `</${inList}>`; inList = null; } if (l.trim() === '') out += '<br>'; else if (/^#+\s/.test(l)) out += `<b>${l.replace(/^#+\s/, '')}</b><br>`; else out += l + '<br>'; }
  }
  if (inList) out += `</${inList}>`;
  return out.replace(/(<br>)+$/, '').replace(/<\/(ul|ol)><br>/g, '</$1>');
}
function aiAppend(logId, role, html) {
  const log = document.getElementById(logId); if (!log) return null;
  const d = document.createElement('div'); d.className = 'ai-msg ' + role; d.innerHTML = `<div class="ai-bubble">${html}</div>`;
  log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
}
async function aiAsk(q, logId = 'ai-log', inputId = 'ai-q', btnId = 'ai-send') {
  q = (q || '').trim(); if (!q) return;
  const input = document.getElementById(inputId); const btn = document.getElementById(btnId);
  if (input) input.value = ''; if (btn) btn.disabled = true;
  aiAppend(logId, 'user', aiEsc(q));
  const wait = aiAppend(logId, 'assistant', '<span class="ai-typing">Hľadám…</span>');
  try {
    const r = await fetch('/assistant/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
    const j = await r.json();
    if (!r.ok) { wait.querySelector('.ai-bubble').innerHTML = '<span class="ai-err">' + aiEsc(j.error || 'Chyba') + '</span>' + (j.settings ? ` <a href="${j.settings}">Nastaviť →</a>` : ''); }
    else {
      let tools = '';
      if (j.tools && j.tools.length) tools = `<div class="ai-tools">${j.tools.map((t) => aiEsc(t.name.replace('search_', 'hľadal: ').replace('get_overview', 'prehľad') + (t.count !== undefined && t.name !== 'get_overview' ? ' (' + t.count + ')' : ''))).join(' · ')}</div>`;
      wait.querySelector('.ai-bubble').innerHTML = aiMd(j.answer) + tools;
    }
  } catch (e) { wait.querySelector('.ai-bubble').innerHTML = '<span class="ai-err">Chyba spojenia.</span>'; }
  if (btn) btn.disabled = false; if (input) input.focus();
  const log = document.getElementById(logId); if (log) log.scrollTop = log.scrollHeight;
}
async function aiReset() { await fetch('/assistant/reset', { method: 'POST' }); document.querySelectorAll('.ai-log').forEach((l) => (l.innerHTML = '')); }
// plávajúci panel
function aiToggle() { const p = document.getElementById('ai-panel'); if (!p) return; p.classList.toggle('open'); if (p.classList.contains('open')) { const i = document.getElementById('ai-q-f'); if (i) i.focus(); } }
