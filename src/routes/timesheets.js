const router = require('express').Router();
const { all, get, run, transaction, log } = require('../db');
const U = require('../utils');

router.get('/', (req, res) => {
  const week = req.query.week ? U.weekStart(req.query.week) : null;
  const status = req.query.status || '';
  const params = []; let where = '1=1';
  if (week) { where += ' AND t.week_start = ?'; params.push(week); }
  if (status) { where += ' AND t.status = ?'; params.push(status); }
  const sheets = all(`SELECT t.*, s.name AS site_name, c.name AS client_name,
      (SELECT COUNT(*) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS workers,
      (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS hours
    FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE ${where} ORDER BY t.week_start DESC, c.name, s.name LIMIT 200`, params);
  const sites = all("SELECT s.id, s.name, c.name AS client_name FROM sites s JOIN clients c ON c.id=s.client_id WHERE s.status != 'finished' ORDER BY c.name, s.name");
  res.render('timesheets/index', { title: 'Hodinové lístky', sheets, sites, week, status, thisWeek: U.weekStart() });
});
router.post('/new', (req, res) => {
  const siteId = req.body.site_id; const week = U.weekStart(req.body.week || U.today());
  if (!siteId) { req.flash('err', 'Vyberte stavbu.'); return res.redirect('/timesheets'); }
  let t = get('SELECT * FROM timesheets WHERE site_id = ? AND week_start = ?', [siteId, week]);
  if (!t) {
    const r = run('INSERT INTO timesheets(site_id, week_start) VALUES (?, ?)', [siteId, week]);
    t = { id: r.lastInsertRowid };
    // predvyplň pracovníkov z predchádzajúceho týždňa
    const prev = get('SELECT id FROM timesheets WHERE site_id = ? AND week_start < ? ORDER BY week_start DESC LIMIT 1', [siteId, week]);
    if (prev) for (const row of all('SELECT worker_id, rate_override FROM timesheet_rows WHERE timesheet_id = ?', [prev.id])) run('INSERT INTO timesheet_rows(timesheet_id, worker_id, rate_override) VALUES (?,?,?)', [t.id, row.worker_id, row.rate_override]);
  }
  res.redirect('/timesheets/' + t.id);
});
function load(id) {
  const t = get('SELECT t.*, s.name AS site_name, s.hourly_rate AS site_rate, c.name AS client_name, c.id AS client_id FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE t.id = ?', [id]);
  if (!t) return null;
  t.rows = all('SELECT r.*, w.first_name, w.last_name, w.position, w.hourly_cost, w.hourly_rate AS worker_rate FROM timesheet_rows r JOIN workers w ON w.id=r.worker_id WHERE r.timesheet_id = ? ORDER BY w.last_name, w.first_name', [id]);
  return t;
}
router.get('/:id', (req, res) => {
  const t = load(req.params.id);
  if (!t) return res.status(404).render('error', { title: 'Chyba', message: 'Hodinový lístok neexistuje' });
  const inRows = new Set(t.rows.map((r) => r.worker_id));
  const workers = all('SELECT * FROM workers WHERE active = 1 ORDER BY last_name, first_name').filter((w) => !inRows.has(w.id));
  const days = []; for (let i = 0; i < 7; i++) days.push(U.addDays(t.week_start, i));
  const wk = U.isoWeek(t.week_start);
  res.render('timesheets/detail', { title: `Hodinový lístok T${wk.week}/${wk.year} – ${t.site_name}`, t, workers, days, wk, print: req.query.print === '1' });
});
router.post('/:id/rows/add', (req, res) => {
  const ids = [].concat(req.body.worker_id || []);
  for (const wid of ids) if (wid && !get('SELECT id FROM timesheet_rows WHERE timesheet_id=? AND worker_id=?', [req.params.id, wid])) run('INSERT INTO timesheet_rows(timesheet_id, worker_id) VALUES (?,?)', [req.params.id, wid]);
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
      run('UPDATE timesheet_rows SET d1=?, d2=?, d3=?, d4=?, d5=?, d6=?, d7=?, rate_override=?, note=? WHERE id=?',
        [U.num(r.d1), U.num(r.d2), U.num(r.d3), U.num(r.d4), U.num(r.d5), U.num(r.d6), U.num(r.d7), r.rate_override ? U.num(r.rate_override) : null, r.note || '', rowId]);
    }
    run('UPDATE timesheets SET note = ? WHERE id = ?', [req.body.note || '', t.id]);
    if (req.body.action === 'approve') { run("UPDATE timesheets SET status='approved' WHERE id=?", [t.id]); log('timesheet', `Schválený hodinový lístok #${t.id} (${U.fmtDate(t.week_start)})`); }
    if (req.body.action === 'reopen') run("UPDATE timesheets SET status='draft' WHERE id=?", [t.id]);
  });
  req.flash('ok', req.body.action === 'approve' ? 'Lístok uložený a schválený.' : 'Lístok uložený.');
  res.redirect('/timesheets/' + t.id);
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
