// Ubytovanie pracovníkov v DE: ubytovne, lôžka, pobyty, náklady a zrážky
const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const CHARGE = { company: 'hradí firma', worker: 'zráža sa pracovníkovi', client: 'preúčtuje sa klientovi' };

router.get('/', (req, res) => {
  const today = U.today();
  const lodgings = all(`SELECT l.*, (SELECT COUNT(*) FROM lodging_stays s WHERE s.lodging_id = l.id AND s.date_from <= ? AND (s.date_to IS NULL OR s.date_to >= ?)) AS occupied FROM lodgings l ORDER BY l.active DESC, l.city, l.name`, [today, today]);
  const month = (req.query.month || today).slice(0, 7);
  res.render('lodging/index', { title: 'Ubytovanie', lodgings, month, CHARGE, cost: monthCost(month) });
});
function monthCost(month) {
  const from = month + '-01', to = U.monthEnd(from);
  const stays = all('SELECT s.*, l.name AS lodging_name, l.monthly_cost, w.first_name, w.last_name FROM lodging_stays s JOIN lodgings l ON l.id = s.lodging_id JOIN workers w ON w.id = s.worker_id WHERE s.date_from <= ? AND (s.date_to IS NULL OR s.date_to >= ?)', [to, from]);
  let total = 0; const rows = stays.map((s) => { const a = s.date_from > from ? s.date_from : from; const b = !s.date_to || s.date_to > to ? to : s.date_to; const nights = Math.max(0, U.diffDays(b, a) + 1); const cost = U.round2(nights * (s.price_per_night || 0)); total += cost; return { ...s, nights, cost }; });
  return { rows, total: U.round2(total), fixed: U.round2(all('SELECT COALESCE(SUM(monthly_cost),0) AS s FROM lodgings WHERE active = 1').reduce((a, r) => a + r.s, 0)) };
}
const formData = () => ({ workers: all('SELECT id, first_name, last_name FROM workers WHERE active = 1 ORDER BY last_name'), CHARGE });
router.get('/new', (req, res) => res.render('lodging/form', { title: 'Nová ubytovňa', l: { country: 'DE', active: 1, capacity: 4 } }));
router.get('/:id/edit', (req, res) => { const l = get('SELECT * FROM lodgings WHERE id = ?', [req.params.id]); if (!l) return res.status(404).render('error', { title: 'Chyba', message: 'Ubytovňa neexistuje' }); res.render('lodging/form', { title: 'Upraviť ubytovňu', l }); });
router.post('/save', (req, res) => {
  const b = req.body; const vals = [b.name.trim(), b.address || '', b.city || '', (b.country || 'DE').toUpperCase().slice(0, 2), parseInt(b.capacity, 10) || 0, U.num(b.price_per_night), U.num(b.monthly_cost), b.landlord || '', b.contact || '', b.active ? 1 : 0, b.note || ''];
  let id = b.id;
  if (id) run('UPDATE lodgings SET name=?, address=?, city=?, country=?, capacity=?, price_per_night=?, monthly_cost=?, landlord=?, contact=?, active=?, note=? WHERE id=?', [...vals, id]);
  else { const r = run('INSERT INTO lodgings(name, address, city, country, capacity, price_per_night, monthly_cost, landlord, contact, active, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)', vals); id = r.lastInsertRowid; log('lodging', `Pridaná ubytovňa ${b.name}`); }
  req.flash('ok', 'Ubytovňa uložená.'); res.redirect('/lodging/' + id);
});
router.get('/:id', (req, res) => {
  const l = get('SELECT * FROM lodgings WHERE id = ?', [req.params.id]); if (!l) return res.status(404).render('error', { title: 'Chyba', message: 'Ubytovňa neexistuje' });
  const stays = all('SELECT s.*, w.first_name, w.last_name FROM lodging_stays s JOIN workers w ON w.id = s.worker_id WHERE s.lodging_id = ? ORDER BY CASE WHEN s.date_to IS NULL THEN 0 ELSE 1 END, s.date_from DESC', [l.id]);
  const today = U.today(); const current = stays.filter((s) => s.date_from <= today && (!s.date_to || s.date_to >= today));
  res.render('lodging/detail', { title: l.name, l, stays, current, ...formData() });
});
router.post('/:id/stays/save', (req, res) => {
  const b = req.body; const ids = [].concat(b.worker_id || []).filter(Boolean);
  if (b.stay_id) run('UPDATE lodging_stays SET date_from=?, date_to=?, price_per_night=?, charge_to=?, note=? WHERE id=? AND lodging_id=?', [b.date_from, b.date_to || null, U.num(b.price_per_night), CHARGE[b.charge_to] ? b.charge_to : 'company', b.note || '', b.stay_id, req.params.id]);
  else for (const w of ids) run('INSERT INTO lodging_stays(lodging_id, worker_id, date_from, date_to, price_per_night, charge_to, note) VALUES (?,?,?,?,?,?,?)', [req.params.id, w, b.date_from, b.date_to || null, U.num(b.price_per_night), CHARGE[b.charge_to] ? b.charge_to : 'company', b.note || '']);
  req.flash('ok', 'Pobyt uložený.'); res.redirect('/lodging/' + req.params.id);
});
router.post('/:id/stays/:sid/end', (req, res) => { run('UPDATE lodging_stays SET date_to = ? WHERE id = ? AND lodging_id = ?', [req.body.date_to || U.today(), req.params.sid, req.params.id]); res.redirect('/lodging/' + req.params.id); });
router.post('/:id/stays/:sid/delete', (req, res) => { run('DELETE FROM lodging_stays WHERE id = ? AND lodging_id = ?', [req.params.sid, req.params.id]); res.redirect('/lodging/' + req.params.id); });
// vytvorenie zrážok pracovníkom za ubytovanie v mesiaci (pre vyúčtovanie)
router.post('/deductions', (req, res) => {
  const month = req.body.month; const c = monthCost(month); let n = 0;
  for (const r of c.rows.filter((x) => x.charge_to === 'worker' && x.cost > 0)) {
    const desc = `Ubytovanie ${r.lodging_name} ${month} (${r.nights} nocí)`;
    if (get("SELECT 1 FROM worker_transactions WHERE worker_id = ? AND type = 'deduction' AND description = ?", [r.worker_id, desc])) continue;
    run("INSERT INTO worker_transactions(worker_id, date, type, description, amount, created_by) VALUES (?,?,'deduction',?,?,?)", [r.worker_id, U.monthEnd(month + '-01'), desc, r.cost, req.session.user.id]); n++;
  }
  req.flash('ok', `Vytvorených zrážok za ubytovanie: ${n}.`); res.redirect('/lodging?month=' + month);
});
module.exports = router;
module.exports.monthCost = monthCost;
