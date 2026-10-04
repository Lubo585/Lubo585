const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const { ASSIGNMENT_TYPES } = require('../services/compliance');

router.get('/', (req, res) => {
  const month = (req.query.month || U.today()).slice(0, 7);
  const from = month + '-01', to = U.monthEnd(from);
  const days = []; for (let d = from; d <= to; d = U.addDays(d, 1)) days.push(d);
  const workers = all('SELECT id, first_name, last_name, position FROM workers WHERE active = 1 ORDER BY last_name, first_name');
  const assignments = all('SELECT a.*, s.name AS site_name, c.name AS client_name FROM assignments a LEFT JOIN sites s ON s.id=a.site_id LEFT JOIN clients c ON c.id=s.client_id WHERE a.date_from <= ? AND a.date_to >= ?', [to, from]);
  const byWorker = new Map();
  for (const a of assignments) { if (!byWorker.has(a.worker_id)) byWorker.set(a.worker_id, []); byWorker.get(a.worker_id).push(a); }
  const sites = all("SELECT s.id, s.name, s.workers_needed, c.name AS client_name FROM sites s JOIN clients c ON c.id=s.client_id WHERE s.status != 'finished' ORDER BY c.name, s.name");
  // obsadenosť zákaziek dnes
  const today = U.today();
  const occupancy = sites.map((s) => ({ ...s, planned: get("SELECT COUNT(DISTINCT worker_id) AS n FROM assignments WHERE site_id = ? AND type = 'work' AND date_from <= ? AND date_to >= ?", [s.id, today, today]).n }));
  const free = workers.filter((w) => !assignments.some((a) => a.worker_id === w.id && a.date_from <= today && a.date_to >= today));
  res.render('planning/index', { title: 'Plánovanie nasadení', month, days, workers, byWorker, sites, occupancy, free, ASSIGNMENT_TYPES, prev: U.addMonths(from, -1).slice(0, 7), next: U.addMonths(from, 1).slice(0, 7), today });
});
router.post('/save', (req, res) => {
  const b = req.body; const ids = [].concat(b.worker_id || []).filter(Boolean);
  if (!ids.length || !b.date_from || !b.date_to) { req.flash('err', 'Vyberte pracovníka a obdobie.'); return res.redirect('/planning?month=' + (b.date_from || '').slice(0, 7)); }
  for (const wid of ids) run('INSERT INTO assignments(worker_id, site_id, type, date_from, date_to, note) VALUES (?,?,?,?,?,?)', [wid, b.type === 'work' ? (b.site_id || null) : null, ASSIGNMENT_TYPES[b.type] ? b.type : 'work', b.date_from, b.date_to, b.note || '']);
  log('planning', `Naplánované: ${ids.length} pracovníkov, ${ASSIGNMENT_TYPES[b.type] ? ASSIGNMENT_TYPES[b.type][0] : b.type} ${U.fmtDate(b.date_from)} – ${U.fmtDate(b.date_to)}`);
  req.flash('ok', 'Plán uložený.'); res.redirect('/planning?month=' + b.date_from.slice(0, 7));
});
router.post('/:id/delete', (req, res) => { const a = get('SELECT * FROM assignments WHERE id = ?', [req.params.id]); run('DELETE FROM assignments WHERE id = ?', [req.params.id]); res.redirect(req.body.back || ('/planning?month=' + (a ? a.date_from.slice(0, 7) : ''))); });
module.exports = router;
