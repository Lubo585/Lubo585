const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');

router.get('/', (req, res) => {
  const month = (req.query.month || U.today()).slice(0, 7);
  const from = month + '-01', to = U.monthEnd(from);
  const cat = req.query.category || '';
  const params = [from, to]; let where = 'e.date >= ? AND e.date <= ?';
  if (cat) { where += ' AND e.category = ?'; params.push(cat); }
  const expenses = all(`SELECT e.*, w.first_name, w.last_name, s.name AS site_name FROM expenses e LEFT JOIN workers w ON w.id=e.worker_id LEFT JOIN sites s ON s.id=e.site_id WHERE ${where} ORDER BY e.date DESC, e.id DESC`, params);
  const byCat = all('SELECT category, SUM(amount_net) AS net, SUM(amount_total) AS total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category ORDER BY net DESC', [from, to]);
  const sumNet = expenses.reduce((s, e) => s + e.amount_net, 0), sumTotal = expenses.reduce((s, e) => s + e.amount_total, 0);
  const recurring = all('SELECT * FROM expenses WHERE recurring = 1 AND date < ? ORDER BY date DESC', [from]);
  const seen = new Set(); const recurringCandidates = [];
  for (const r of recurring) { const k = r.category + '|' + r.description + '|' + r.supplier; if (seen.has(k)) continue; seen.add(k); if (!get('SELECT id FROM expenses WHERE category=? AND description=? AND date >= ? AND date <= ?', [r.category, r.description, from, to])) recurringCandidates.push(r); }
  res.render('expenses/index', { title: 'Náklady', expenses, byCat, sumNet, sumTotal, month, cat, categories: U.EXPENSE_CATEGORIES, recurringCandidates });
});
function formData(e) {
  return { e, categories: U.EXPENSE_CATEGORIES, workers: all('SELECT id, first_name, last_name FROM workers WHERE active=1 ORDER BY last_name'), sites: all('SELECT s.id, s.name, c.name AS client_name FROM sites s JOIN clients c ON c.id=s.client_id WHERE s.active=1 ORDER BY c.name, s.name') };
}
router.get('/new', (req, res) => res.render('expenses/form', { title: 'Nový náklad', ...formData({ date: U.today(), vat_rate: 23, paid: 1, category: req.query.category || '' }) }));
router.get('/:id/edit', (req, res) => {
  const e = get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!e) return res.status(404).render('error', { title: 'Chyba', message: 'Náklad neexistuje' });
  res.render('expenses/form', { title: 'Upraviť náklad', ...formData(e) });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const net = U.num(b.amount_net); const vat = U.num(b.vat_rate);
  let total = b.amount_total ? U.num(b.amount_total) : U.round2(net * (1 + vat / 100));
  if (b.amount_total && !b.amount_net) { /* zadané iba s DPH */ }
  const vals = [b.date, b.category, b.description || '', b.supplier || '', net, vat, total, b.worker_id || null, b.site_id || null, b.recurring ? 1 : 0, b.paid ? 1 : 0, b.note || ''];
  if (b.id) { run('UPDATE expenses SET date=?, category=?, description=?, supplier=?, amount_net=?, vat_rate=?, amount_total=?, worker_id=?, site_id=?, recurring=?, paid=?, note=? WHERE id=?', [...vals, b.id]); req.flash('ok', 'Náklad uložený.'); }
  else { run('INSERT INTO expenses(date, category, description, supplier, amount_net, vat_rate, amount_total, worker_id, site_id, recurring, paid, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', vals); req.flash('ok', 'Náklad pridaný.'); }
  res.redirect('/expenses?month=' + b.date.slice(0, 7));
});
router.post('/copy-recurring', (req, res) => {
  const month = req.body.month; const ids = [].concat(req.body.ids || []);
  let n = 0;
  for (const id of ids) {
    const r = get('SELECT * FROM expenses WHERE id = ?', [id]); if (!r) continue;
    const day = r.date.slice(8, 10); const date = month + '-' + (day > U.monthEnd(month + '-01').slice(8, 10) ? U.monthEnd(month + '-01').slice(8, 10) : day);
    run('INSERT INTO expenses(date, category, description, supplier, amount_net, vat_rate, amount_total, worker_id, site_id, recurring, paid, note) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)', [date, r.category, r.description, r.supplier, r.amount_net, r.vat_rate, r.amount_total, r.worker_id, r.site_id, r.paid, r.note]); n++;
  }
  req.flash('ok', `Skopírovaných ${n} opakujúcich sa nákladov.`); log('expense', `Skopírované opakujúce sa náklady do ${month}: ${n}`);
  res.redirect('/expenses?month=' + month);
});
router.post('/:id/delete', (req, res) => { run('DELETE FROM expenses WHERE id = ?', [req.params.id]); req.flash('ok', 'Náklad odstránený.'); res.redirect('back'); });
module.exports = router;
