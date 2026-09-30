const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');

router.get('/', (req, res) => {
  const clients = all(`SELECT c.*, (SELECT COUNT(*) FROM sites s WHERE s.client_id=c.id AND s.active=1) AS sites_count,
    (SELECT COALESCE(SUM(amount_due - paid_amount),0) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('issued','partial')) AS open_amount,
    (SELECT COUNT(*) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('issued','partial') AND i.due_date < ?) AS overdue_count
    FROM clients c ORDER BY c.name`, [U.today()]);
  res.render('clients/index', { title: 'Klienti (odberatelia)', clients });
});
router.get('/new', (req, res) => res.render('clients/form', { title: 'Nový klient', c: { due_days: Number(res.locals.settings.default_due_days) || 14, active: 1, retention_percent: 0, skonto_percent: 0 } }));
router.get('/:id', (req, res) => {
  const c = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).render('error', { title: 'Chyba', message: 'Klient neexistuje' });
  const sites = all('SELECT * FROM sites WHERE client_id = ? ORDER BY active DESC, name', [c.id]);
  const invoices = all('SELECT * FROM invoices WHERE client_id = ? ORDER BY issue_date DESC, id DESC LIMIT 50', [c.id]);
  res.render('clients/detail', { title: c.name, c, sites, invoices });
});
router.get('/:id/edit', (req, res) => {
  const c = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).render('error', { title: 'Chyba', message: 'Klient neexistuje' });
  res.render('clients/form', { title: 'Upraviť klienta', c });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const vals = [b.name.trim(), b.ico || '', b.dic || '', b.ic_dph || '', b.address || '', b.email || '', b.phone || '', b.contact_person || '', parseInt(b.due_days, 10) || 14,
    U.num(b.retention_percent), parseInt(b.retention_months, 10) || 0, U.num(b.skonto_percent), parseInt(b.skonto_days, 10) || 0, b.reverse_charge ? 1 : 0, b.note || '', b.active ? 1 : 0];
  let id = b.id;
  if (id) { run('UPDATE clients SET name=?, ico=?, dic=?, ic_dph=?, address=?, email=?, phone=?, contact_person=?, due_days=?, retention_percent=?, retention_months=?, skonto_percent=?, skonto_days=?, reverse_charge=?, note=?, active=? WHERE id=?', [...vals, id]); req.flash('ok', 'Klient uložený.'); }
  else { const r = run('INSERT INTO clients(name, ico, dic, ic_dph, address, email, phone, contact_person, due_days, retention_percent, retention_months, skonto_percent, skonto_days, reverse_charge, note, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', vals); id = r.lastInsertRowid; req.flash('ok', 'Klient pridaný.'); log('client', `Pridaný klient ${b.name}`); }
  res.redirect('/clients/' + id);
});
// stavby / zákazky
router.post('/:id/sites/save', (req, res) => {
  const b = req.body;
  const vals = [b.name.trim(), b.address || '', U.num(b.hourly_rate), b.overtime_rate ? U.num(b.overtime_rate) : null, b.active ? 1 : 0, b.note || ''];
  if (b.site_id) run('UPDATE sites SET name=?, address=?, hourly_rate=?, overtime_rate=?, active=?, note=? WHERE id=? AND client_id=?', [...vals, b.site_id, req.params.id]);
  else run('INSERT INTO sites(name, address, hourly_rate, overtime_rate, active, note, client_id) VALUES (?,?,?,?,?,?,?)', [...vals, req.params.id]);
  req.flash('ok', 'Stavba uložená.');
  res.redirect('/clients/' + req.params.id);
});
router.post('/:id/sites/:sid/delete', (req, res) => {
  const used = get('SELECT COUNT(*) AS n FROM timesheets WHERE site_id = ?', [req.params.sid]).n;
  if (used) { run('UPDATE sites SET active = 0 WHERE id = ?', [req.params.sid]); req.flash('warn', 'Stavba má hodinové lístky, bola iba deaktivovaná.'); }
  else { run('DELETE FROM sites WHERE id = ? AND client_id = ?', [req.params.sid, req.params.id]); req.flash('ok', 'Stavba odstránená.'); }
  res.redirect('/clients/' + req.params.id);
});
module.exports = router;
