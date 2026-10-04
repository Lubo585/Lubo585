const router = require('express').Router();
const { all, get, run, transaction, log, getSettings } = require('../db');
const U = require('../utils');
const ATT = require('../services/attachments');

const STATUS = { draft: ['warn', 'Rozpracovaný'], approved: ['info', 'Schválený'], invoiced: ['ok', 'Vyfakturovaný'] };

router.get('/', (req, res) => {
  const week = req.query.week ? U.weekStart(req.query.week) : null;
  const status = req.query.status || '';
  const params = []; let where = '1=1';
  if (week) { where += ' AND t.week_start = ?'; params.push(week); }
  if (status) { where += ' AND t.status = ?'; params.push(status); }
  if (req.query.site) { where += ' AND t.site_id = ?'; params.push(req.query.site); }
  const sheets = all(`SELECT t.*, s.name AS site_name, c.name AS client_name,
      (SELECT COUNT(*) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS workers,
      (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS hours
    FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE ${where} ORDER BY t.week_start DESC, c.name, s.name LIMIT 200`, params);
  const sites = all("SELECT s.id, s.name, c.name AS client_name FROM sites s JOIN clients c ON c.id=s.client_id WHERE s.status != 'finished' ORDER BY c.name, s.name");
  res.render('timesheets/index', { title: 'Hodinové lístky', sheets, sites, week, status, thisWeek: U.weekStart(), STATUS });
});
router.post('/new', (req, res) => {
  const siteId = req.body.site_id; const week = U.weekStart(req.body.week || U.today());
  if (!siteId) { req.flash('err', 'Vyberte stavbu.'); return res.redirect('/timesheets'); }
  let t = get('SELECT * FROM timesheets WHERE site_id = ? AND week_start = ?', [siteId, week]);
  if (!t) {
    const wk = U.isoWeek(week);
    const r = run('INSERT INTO timesheets(site_id, week_start, number) VALUES (?, ?, ?)', [siteId, week, `${wk.year}-${String(wk.week).padStart(2, '0')}-${siteId}`]);
    t = { id: r.lastInsertRowid };
    // predvyplň pracovníkov z plánu nasadení, inak z predchádzajúceho týždňa
    const planned = all("SELECT DISTINCT a.worker_id FROM assignments a JOIN workers w ON w.id = a.worker_id WHERE a.site_id = ? AND a.type = 'work' AND a.date_from <= ? AND a.date_to >= ? AND w.active = 1", [siteId, U.addDays(week, 6), week]);
    if (planned.length) for (const p of planned) run('INSERT INTO timesheet_rows(timesheet_id, worker_id, profession) VALUES (?,?,(SELECT position FROM workers WHERE id = ?))', [t.id, p.worker_id, p.worker_id]);
    else {
      const prev = get('SELECT id FROM timesheets WHERE site_id = ? AND week_start < ? ORDER BY week_start DESC LIMIT 1', [siteId, week]);
      if (prev) for (const row of all('SELECT worker_id, rate_override, profession FROM timesheet_rows WHERE timesheet_id = ?', [prev.id])) run('INSERT INTO timesheet_rows(timesheet_id, worker_id, rate_override, profession) VALUES (?,?,?,?)', [t.id, row.worker_id, row.rate_override, row.profession]);
    }
  }
  res.redirect('/timesheets/' + t.id);
});
function load(id) {
  const t = get('SELECT t.*, s.name AS site_name, s.address AS site_address, s.hourly_rate AS site_rate, s.hours_per_day, s.country AS site_country, c.name AS client_name, c.id AS client_id, c.language AS client_language, c.address AS client_address FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE t.id = ?', [id]);
  if (!t) return null;
  t.rows = all('SELECT r.*, w.first_name, w.last_name, w.position, w.hourly_cost, w.hourly_rate AS worker_rate, w.birth_date FROM timesheet_rows r JOIN workers w ON w.id=r.worker_id WHERE r.timesheet_id = ? ORDER BY w.last_name, w.first_name', [id]);
  const std = Number(t.hours_per_day) || Number(getSettings().standard_hours_per_day) || 8;
  for (const r of t.rows) {
    r.total = U.round2([1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + (r['d' + i] || 0), 0));
    r.overtime = U.round2([1, 2, 3, 4, 5].reduce((s, i) => s + Math.max(0, (r['d' + i] || 0) - std), 0));
    r.warnings = [];
    for (let i = 1; i <= 7; i++) if ((r['d' + i] || 0) > 10) r.warnings.push(`${U.DAY_NAMES[i - 1]}: ${r['d' + i]} h (max. 10 h/deň podľa ArbZG)`);
    if (r.total > 60) r.warnings.push(`${r.total} h/týždeň (max. 60 h, priemer 48 h podľa ArbZG)`);
  }
  t.std = std;
  return t;
}
router.get('/:id', (req, res) => {
  const t = load(req.params.id);
  if (!t) return res.status(404).render('error', { title: 'Chyba', message: 'Hodinový lístok neexistuje' });
  const inRows = new Set(t.rows.map((r) => r.worker_id));
  const workers = all('SELECT * FROM workers WHERE active = 1 ORDER BY last_name, first_name').filter((w) => !inRows.has(w.id));
  const days = []; for (let i = 0; i < 7; i++) days.push(U.addDays(t.week_start, i));
  const wk = U.isoWeek(t.week_start);
  const signature = t.signature_attachment_id ? ATT.find(t.signature_attachment_id) : null;
  res.render('timesheets/detail', { title: `Hodinový lístok T${wk.week}/${wk.year} – ${t.site_name}`, t, workers, days, wk, detailed: req.query.mode === 'detail' || t.rows.some((r) => r.s1 || r.s2 || r.s3 || r.s4 || r.s5), signature, STATUS });
});
router.get('/:id/print', (req, res) => {
  const t = load(req.params.id);
  if (!t) return res.status(404).render('error', { title: 'Chyba', message: 'Hodinový lístok neexistuje' });
  const days = []; for (let i = 0; i < 7; i++) days.push(U.addDays(t.week_start, i));
  const wk = U.isoWeek(t.week_start);
  const lang = req.query.lang || t.client_language || 'sk';
  res.render('timesheets/print', { title: (lang === 'de' ? 'Stundenzettel ' : 'Hodinový lístok ') + `T${wk.week}/${wk.year}`, t, days, wk, lang, signature: t.signature_attachment_id ? ATT.find(t.signature_attachment_id) : null });
});
function hoursFrom(start, end, breakMin) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm); if (mins < 0) mins += 24 * 60;
  return U.round2(Math.max(0, mins - (Number(breakMin) || 0)) / 60);
}
router.post('/:id/rows/add', (req, res) => {
  const ids = [].concat(req.body.worker_id || []);
  for (const wid of ids) if (wid && !get('SELECT id FROM timesheet_rows WHERE timesheet_id=? AND worker_id=?', [req.params.id, wid])) run('INSERT INTO timesheet_rows(timesheet_id, worker_id, profession) VALUES (?,?,(SELECT position FROM workers WHERE id = ?))', [req.params.id, wid, wid]);
  res.redirect('/timesheets/' + req.params.id);
});
router.post('/:id/save', (req, res) => {
  const t = get('SELECT * FROM timesheets WHERE id = ?', [req.params.id]);
  if (!t) return res.redirect('/timesheets');
  if (t.status === 'invoiced') { req.flash('err', 'Vyfakturovaný lístok nie je možné upravovať.'); return res.redirect('/timesheets/' + t.id); }
  const rows = req.body.rows || {};
  transaction(() => {
    for (const [key, r] of Object.entries(rows)) {
      const rowId = String(key).replace(/^r/, '');
      const exists = get('SELECT invoice_id FROM timesheet_rows WHERE id = ? AND timesheet_id = ?', [rowId, t.id]);
      if (!exists || exists.invoice_id) continue;
      const vals = []; const sets = [];
      for (let i = 1; i <= 7; i++) {
        const s = (r['s' + i] || '').trim() || null, e = (r['e' + i] || '').trim() || null, b = parseInt(r['b' + i], 10) || 0;
        let h = U.num(r['d' + i]);
        if (s && e) h = hoursFrom(s, e, b);
        sets.push(`d${i}=?, s${i}=?, e${i}=?, b${i}=?`); vals.push(h, s, e, b);
      }
      run(`UPDATE timesheet_rows SET ${sets.join(', ')}, rate_override=?, note=?, night_hours=?, profession=? WHERE id=?`, [...vals, r.rate_override ? U.num(r.rate_override) : null, r.note || '', U.num(r.night_hours), r.profession || '', rowId]);
    }
    run('UPDATE timesheets SET note = ? WHERE id = ?', [req.body.note || '', t.id]);
    if (req.body.action === 'approve') { run("UPDATE timesheets SET status='approved' WHERE id=?", [t.id]); log('timesheet', `Schválený hodinový lístok #${t.id} (${U.fmtDate(t.week_start)})`); }
    if (req.body.action === 'reopen') run("UPDATE timesheets SET status='draft' WHERE id=?", [t.id]);
  });
  req.flash('ok', req.body.action === 'approve' ? 'Lístok uložený a schválený.' : 'Lístok uložený.');
  res.redirect('/timesheets/' + t.id + (req.body.mode === 'detail' ? '?mode=detail' : ''));
});
// podpis vedúceho stavby (z obrazovky mobilu / tabletu)
router.post('/:id/sign', (req, res) => {
  const t = get('SELECT * FROM timesheets WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Lístok neexistuje' });
  const m = /^data:image\/png;base64,(.+)$/.exec(req.body.image || '');
  if (!m) return res.status(400).json({ error: 'Chýba podpis' });
  const id = ATT.save({ entityType: 'timesheet', entityId: t.id, buffer: Buffer.from(m[1], 'base64'), filename: `podpis-${t.id}.png`, mime: 'image/png', userId: req.session.user.id, kind: 'signature', note: 'Podpis: ' + (req.body.signed_by || '') });
  run("UPDATE timesheets SET signed_by = ?, signed_at = datetime('now'), signature_attachment_id = ? WHERE id = ?", [req.body.signed_by || '', id, t.id]);
  log('timesheet', `Podpísaný hodinový lístok #${t.id} (${req.body.signed_by || ''})`);
  res.json({ ok: true });
});
router.post('/:id/rows/:rid/delete', (req, res) => {
  run('DELETE FROM timesheet_rows WHERE id = ? AND timesheet_id = ? AND invoice_id IS NULL', [req.params.rid, req.params.id]);
  res.redirect('/timesheets/' + req.params.id);
});
router.post('/:id/delete', (req, res) => {
  const t = get('SELECT * FROM timesheets WHERE id = ?', [req.params.id]);
  if (t && t.status !== 'invoiced') { run('DELETE FROM timesheets WHERE id = ?', [t.id]); req.flash('ok', 'Hodinový lístok odstránený.'); }
  else req.flash('err', 'Vyfakturovaný lístok nie je možné odstrániť.');
  res.redirect('/timesheets');
});
module.exports = router;
module.exports.hoursFrom = hoursFrom;
