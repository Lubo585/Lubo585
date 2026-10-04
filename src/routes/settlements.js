const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const S = require('../services/settlements');
const STATUS = { draft: ['warn', 'Koncept'], approved: ['info', 'Schválené'], paid: ['ok', 'Vyplatené'] };

router.get('/', (req, res) => {
  const month = (req.query.month || U.addMonths(U.monthStart(), -1)).slice(0, 7);
  const list = all('SELECT s.*, w.first_name, w.last_name FROM settlements s JOIN workers w ON w.id = s.worker_id WHERE s.month = ? ORDER BY w.last_name', [month]);
  const done = new Set(list.map((s) => s.worker_id));
  const pending = all('SELECT DISTINCT w.id, w.first_name, w.last_name, w.wage_rate FROM workers w JOIN timesheet_rows r ON r.worker_id = w.id JOIN timesheets t ON t.id = r.timesheet_id WHERE w.active = 1 AND t.week_start >= ? AND t.week_start <= ? AND (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) > 0 ORDER BY w.last_name', [U.addDays(month + '-01', -6), U.monthEnd(month + '-01')]).filter((w) => !done.has(w.id));
  const sums = list.reduce((a, s) => ({ hours: a.hours + s.hours, total: a.total + s.total_due, paid: a.paid + (s.status === 'paid' ? s.total_due : 0) }), { hours: 0, total: 0, paid: 0 });
  res.render('settlements/index', { title: 'Vyúčtovanie pracovníkov', list, pending, month, sums, STATUS });
});
router.get('/new', (req, res) => {
  const month = (req.query.month || U.addMonths(U.monthStart(), -1)).slice(0, 7);
  const workers = all('SELECT id, first_name, last_name, wage_rate FROM workers WHERE active = 1 ORDER BY last_name');
  const preview = req.query.worker_id ? S.monthData(req.query.worker_id, month) : null;
  res.render('settlements/new', { title: 'Nové vyúčtovanie', month, workers, worker_id: req.query.worker_id || '', preview, perDiemDefault: Number(res.locals.settings.per_diem_rate_de) || 0 });
});
router.post('/create', (req, res) => {
  try {
    const ids = [].concat(req.body.worker_id || []).filter(Boolean); let last = null; let n = 0;
    for (const id of ids) { try { last = S.create(id, req.body.month, { wage_rate: req.body.wage_rate ? U.num(req.body.wage_rate) : undefined, per_diem_rate: req.body.per_diem_rate !== undefined && req.body.per_diem_rate !== '' ? U.num(req.body.per_diem_rate) : undefined, per_diem_days: req.body.per_diem_days !== undefined && req.body.per_diem_days !== '' ? parseInt(req.body.per_diem_days, 10) : undefined, note: req.body.note }); n++; } catch (e) { if (ids.length === 1) throw e; } }
    req.flash('ok', `Vytvorených vyúčtovaní: ${n}.`);
    res.redirect(ids.length === 1 && last ? '/settlements/' + last : '/settlements?month=' + req.body.month);
  } catch (e) { req.flash('err', e.message); res.redirect('/settlements/new?month=' + req.body.month + '&worker_id=' + (req.body.worker_id || '')); }
});
function load(id) {
  const s = get('SELECT s.*, w.first_name, w.last_name, w.iban, w.position, w.nationality FROM settlements s JOIN workers w ON w.id = s.worker_id WHERE s.id = ?', [id]);
  if (s) { s.transactions = all('SELECT * FROM worker_transactions WHERE settlement_id = ? ORDER BY date', [id]); s.data = S.monthData(s.worker_id, s.month); }
  return s;
}
router.get('/:id', (req, res) => { const s = load(req.params.id); if (!s) return res.status(404).render('error', { title: 'Chyba', message: 'Vyúčtovanie neexistuje' }); res.render('settlements/detail', { title: `Vyúčtovanie ${s.month} – ${s.last_name} ${s.first_name}`, s, STATUS }); });
router.get('/:id/print', (req, res) => { const s = load(req.params.id); if (!s) return res.status(404).send('Nenájdené'); res.render('settlements/print', { title: 'Vyúčtovanie ' + s.month, s, lang: req.query.lang || 'sk' }); });
router.post('/:id/update', (req, res) => {
  const s = get('SELECT * FROM settlements WHERE id = ?', [req.params.id]); if (!s) return res.redirect('/settlements');
  if (s.status === 'paid') { req.flash('err', 'Vyplatené vyúčtovanie sa nedá meniť.'); return res.redirect('/settlements/' + s.id); }
  run('UPDATE settlements SET hours=?, wage_rate=?, per_diem_days=?, per_diem_rate=?, note=? WHERE id=?', [U.num(req.body.hours), U.num(req.body.wage_rate), parseInt(req.body.per_diem_days, 10) || 0, U.num(req.body.per_diem_rate), req.body.note || '', s.id]);
  S.recalc(s.id); req.flash('ok', 'Vyúčtovanie prepočítané.'); res.redirect('/settlements/' + s.id);
});
router.post('/:id/item', (req, res) => {
  const s = get('SELECT * FROM settlements WHERE id = ?', [req.params.id]); if (!s || s.status === 'paid') return res.redirect('/settlements/' + req.params.id);
  const amt = U.num(req.body.amount); if (amt > 0 && ['advance', 'deduction', 'bonus'].includes(req.body.type)) { run('INSERT INTO worker_transactions(worker_id, date, type, description, amount, settlement_id, created_by) VALUES (?,?,?,?,?,?,?)', [s.worker_id, req.body.date || U.today(), req.body.type, req.body.description || '', amt, s.id, req.session.user.id]); S.recalc(s.id); }
  res.redirect('/settlements/' + s.id);
});
router.post('/:id/item/:tid/delete', (req, res) => { const s = get('SELECT * FROM settlements WHERE id = ?', [req.params.id]); if (s && s.status !== 'paid') { run('DELETE FROM worker_transactions WHERE id = ? AND settlement_id = ?', [req.params.tid, s.id]); S.recalc(s.id); } res.redirect('/settlements/' + req.params.id); });
router.post('/:id/status', (req, res) => {
  const st = req.body.status; if (!STATUS[st]) return res.redirect('/settlements/' + req.params.id);
  run('UPDATE settlements SET status = ?, paid_at = ? WHERE id = ?', [st, st === 'paid' ? (req.body.paid_at || U.today()) : null, req.params.id]);
  if (st === 'paid') { const s = load(req.params.id); log('settlement', `Vyplatené vyúčtovanie ${s.month} ${s.last_name} ${s.first_name}: ${U.money(s.total_due)}`); if (req.body.as_expense) run("INSERT INTO expenses(date, category, description, worker_id, amount_net, vat_rate, amount_total, paid, note) VALUES (?,?,?,?,?,0,?,1,?)", [req.body.paid_at || U.today(), 'Mzdy a odvody', `Mzda ${s.month} – ${s.last_name} ${s.first_name}`, s.worker_id, s.total_due, s.total_due, 'Z vyúčtovania pracovníka']); }
  req.flash('ok', 'Stav zmenený.'); res.redirect('/settlements/' + req.params.id);
});
router.post('/:id/delete', (req, res) => { const s = get('SELECT * FROM settlements WHERE id = ?', [req.params.id]); if (s && s.status !== 'paid') { run('UPDATE worker_transactions SET settlement_id = NULL WHERE settlement_id = ?', [s.id]); run('DELETE FROM settlements WHERE id = ?', [s.id]); req.flash('ok', 'Vyúčtovanie odstránené, zálohy a zrážky ostali nevyúčtované.'); } res.redirect('/settlements'); });
module.exports = router;
