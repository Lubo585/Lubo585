const router = require('express').Router();
const { all, get, run, transaction, getSetting, log } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');
const reminders = require('../services/reminders');

router.get('/', (req, res) => {
  const f = req.query.filter || 'open';
  const today = U.today();
  let where = '1=1';
  if (f === 'open') where = "i.status IN ('issued','partial')";
  else if (f === 'overdue') where = `i.status IN ('issued','partial') AND i.due_date < '${today}'`;
  else if (f === 'paid') where = "i.status = 'paid'";
  else if (f === 'retention') where = "i.status != 'cancelled' AND i.retention_amount > i.retention_paid + 0.005";
  const params = [];
  if (req.query.client) { where += ' AND i.client_id = ?'; params.push(req.query.client); }
  if (req.query.q) { where += ' AND (i.number LIKE ? OR c.name LIKE ?)'; params.push('%' + req.query.q + '%', '%' + req.query.q + '%'); }
  const invoices = all(`SELECT i.*, c.name AS client_name, (SELECT MAX(level) FROM reminders r WHERE r.invoice_id=i.id AND r.status != 'failed') AS reminder_level
    FROM invoices i JOIN clients c ON c.id=i.client_id WHERE ${where} ORDER BY i.issue_date DESC, i.id DESC LIMIT 300`, params);
  const clients = all('SELECT id, name FROM clients ORDER BY name');
  const sums = { total: 0, remaining: 0, retention: 0 };
  for (const i of invoices) { sums.total += i.total; sums.remaining += INV.remaining(i); sums.retention += INV.retentionRemaining(i); }
  res.render('invoices/index', { title: 'Faktúry', invoices, clients, f, sums, q: req.query.q || '', client: req.query.client || '' });
});

// ---- nová faktúra z hodinových lístkov ----
router.get('/from-timesheets', (req, res) => {
  const clients = all('SELECT * FROM clients WHERE active=1 ORDER BY name');
  const pending = all(`SELECT c.id AS client_id, c.name AS client_name, s.id AS site_id, s.name AS site_name, MIN(t.week_start) AS first_week, MAX(t.week_start) AS last_week,
      SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) AS hours, COUNT(DISTINCT t.id) AS sheets
    FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id
    WHERE t.status='approved' AND r.invoice_id IS NULL GROUP BY s.id ORDER BY c.name, s.name`);
  const sites = all('SELECT id, client_id, name FROM sites WHERE active=1 ORDER BY name');
  const today = U.today();
  res.render('invoices/from_timesheets', { title: 'Fakturovať hodiny', clients, pending, sites, from: U.monthStart(U.addMonths(today, -1)), to: U.monthEnd(U.addMonths(today, -1)), today, client_id: req.query.client_id || '', site_id: req.query.site_id || '' });
});
router.post('/from-timesheets', (req, res) => {
  try {
    const id = INV.createFromTimesheets({ clientId: req.body.client_id, siteId: req.body.site_id || null, from: U.weekStart(req.body.from), to: req.body.to, issueDate: req.body.issue_date, vatRate: U.num(req.body.vat_rate), note: req.body.note });
    req.flash('ok', 'Faktúra vystavená.');
    res.redirect('/invoices/' + id);
  } catch (e) { req.flash('err', e.message); res.redirect('/invoices/from-timesheets'); }
});

// ---- ručná faktúra ----
router.get('/new', (req, res) => {
  const clients = all('SELECT * FROM clients WHERE active=1 ORDER BY name');
  const sites = all('SELECT id, client_id, name FROM sites WHERE active=1 ORDER BY name');
  const today = U.today();
  res.render('invoices/form', { title: 'Nová faktúra', inv: { issue_date: today, delivery_date: today, due_date: U.addDays(today, Number(getSetting('default_due_days')) || 14), vat_rate: Number(getSetting('default_vat_rate')), number: INV.nextInvoiceNumber(today), items: [{ description: '', quantity: 1, unit: 'hod', unit_price: 0 }], fees: [] }, clients, sites });
});
router.get('/:id/edit', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).render('error', { title: 'Chyba', message: 'Faktúra neexistuje' });
  inv.items = all('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id', [inv.id]);
  inv.fees = all('SELECT * FROM invoice_fees WHERE invoice_id = ?', [inv.id]);
  const clients = all('SELECT * FROM clients ORDER BY name');
  const sites = all('SELECT id, client_id, name FROM sites ORDER BY name');
  res.render('invoices/form', { title: 'Upraviť faktúru ' + inv.number, inv, clients, sites });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const items = Object.values(b.items || {}).filter((i) => i.description && i.description.trim());
  const fees = Object.values(b.fees || {}).filter((f) => f.name && f.name.trim());
  const number = (b.number || '').trim() || INV.nextInvoiceNumber(b.issue_date);
  const vals = [number, (b.variable_symbol || number).replace(/\D/g, ''), b.client_id, b.site_id || null, b.issue_date, b.delivery_date || b.issue_date, b.due_date, b.period_from || null, b.period_to || null,
    U.num(b.vat_rate), b.reverse_charge ? 1 : 0, U.num(b.retention_percent), b.retention_due_date || null, U.num(b.skonto_percent), parseInt(b.skonto_days, 10) || 0, b.note || ''];
  try {
    const id = transaction(() => {
      let id = b.id;
      if (id) {
        const dup = get('SELECT id FROM invoices WHERE number = ? AND id != ?', [number, id]); if (dup) throw new Error('Číslo faktúry už existuje.');
        run('UPDATE invoices SET number=?, variable_symbol=?, client_id=?, site_id=?, issue_date=?, delivery_date=?, due_date=?, period_from=?, period_to=?, vat_rate=?, reverse_charge=?, retention_percent=?, retention_due_date=?, skonto_percent=?, skonto_days=?, note=? WHERE id=?', [...vals, id]);
        run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]); run('DELETE FROM invoice_fees WHERE invoice_id = ?', [id]);
      } else {
        if (get('SELECT id FROM invoices WHERE number = ?', [number])) throw new Error('Číslo faktúry už existuje.');
        const r = run("INSERT INTO invoices(number, variable_symbol, client_id, site_id, issue_date, delivery_date, due_date, period_from, period_to, vat_rate, reverse_charge, retention_percent, retention_due_date, skonto_percent, skonto_days, note, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'issued')", vals);
        id = Number(r.lastInsertRowid);
        log('invoice', `Vystavená faktúra ${number}`);
      }
      items.forEach((i, idx) => run('INSERT INTO invoice_items(invoice_id, description, quantity, unit, unit_price, sort_order) VALUES (?,?,?,?,?,?)', [id, i.description.trim(), U.num(i.quantity, 1), i.unit || 'ks', U.num(i.unit_price), idx]));
      for (const f of fees) run('INSERT INTO invoice_fees(invoice_id, name, amount) VALUES (?,?,?)', [id, f.name.trim(), U.num(f.amount)]);
      INV.recalc(id);
      return id;
    });
    req.flash('ok', 'Faktúra uložená.');
    res.redirect('/invoices/' + id);
  } catch (e) { req.flash('err', e.message); res.redirect(b.id ? `/invoices/${b.id}/edit` : '/invoices/new'); }
});

function loadInvoice(id) {
  const inv = get('SELECT i.*, c.name AS client_name, c.address AS client_address, c.ico AS client_ico, c.dic AS client_dic, c.ic_dph AS client_ic_dph, c.email AS client_email, s.name AS site_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN sites s ON s.id=i.site_id WHERE i.id = ?', [id]);
  if (!inv) return null;
  inv.items = all('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id', [id]);
  inv.fees = all('SELECT * FROM invoice_fees WHERE invoice_id = ?', [id]);
  inv.payments = all('SELECT p.*, b.counterparty_name FROM payments p LEFT JOIN bank_transactions b ON b.id=p.bank_transaction_id WHERE p.invoice_id = ? ORDER BY p.date, p.id', [id]);
  inv.reminders = all('SELECT * FROM reminders WHERE invoice_id = ? ORDER BY sent_at DESC', [id]);
  inv.timesheets = all('SELECT DISTINCT t.id, t.week_start, s.name AS site_name FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN sites s ON s.id=t.site_id WHERE r.invoice_id = ? ORDER BY t.week_start', [id]);
  return inv;
}
router.get('/:id', (req, res) => {
  const inv = loadInvoice(req.params.id);
  if (!inv) return res.status(404).render('error', { title: 'Chyba', message: 'Faktúra neexistuje' });
  const levels = String(getSetting('reminder_days')).split(',').map((x) => parseInt(x, 10)).filter((x) => !isNaN(x));
  res.render('invoices/detail', { title: 'Faktúra ' + inv.number, inv, levels });
});
router.get('/:id/print', (req, res) => {
  const inv = loadInvoice(req.params.id);
  if (!inv) return res.status(404).render('error', { title: 'Chyba', message: 'Faktúra neexistuje' });
  res.render('invoices/print', { title: 'Faktúra ' + inv.number, inv, layout: false });
});
router.post('/:id/payments/add', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.redirect('/invoices');
  const amt = U.num(req.body.amount);
  if (amt <= 0) { req.flash('err', 'Zadajte sumu.'); return res.redirect('/invoices/' + inv.id); }
  INV.addPayment({ invoiceId: inv.id, date: req.body.date || U.today(), amount: amt, type: req.body.type || 'payment', note: req.body.note || 'Ručne zadaná úhrada' });
  log('payment', `Ručne zadaná úhrada ${U.money(amt)} k faktúre ${inv.number}`);
  req.flash('ok', 'Úhrada zaznamenaná.');
  res.redirect('/invoices/' + inv.id);
});
router.post('/:id/payments/:pid/delete', (req, res) => {
  run('DELETE FROM payments WHERE id = ? AND invoice_id = ? AND bank_transaction_id IS NULL', [req.params.pid, req.params.id]);
  INV.refreshStatus(req.params.id);
  res.redirect('/invoices/' + req.params.id);
});
router.post('/:id/status', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.redirect('/invoices');
  const st = req.body.status;
  if (st === 'cancelled') {
    transaction(() => {
      run("UPDATE invoices SET status='cancelled' WHERE id=?", [inv.id]);
      run("UPDATE timesheet_rows SET invoice_id = NULL WHERE invoice_id = ?", [inv.id]);
      run("UPDATE timesheets SET status='approved' WHERE status='invoiced' AND id IN (SELECT timesheet_id FROM timesheet_rows WHERE invoice_id IS NULL AND timesheet_id IN (SELECT t.id FROM timesheets t))");
    });
    log('invoice', `Stornovaná faktúra ${inv.number}`);
    req.flash('ok', 'Faktúra stornovaná, hodinové lístky uvoľnené.');
  } else if (st === 'issued') { run("UPDATE invoices SET status='issued' WHERE id=?", [inv.id]); INV.refreshStatus(inv.id); req.flash('ok', 'Faktúra obnovená.'); }
  res.redirect('/invoices/' + inv.id);
});
router.post('/:id/delete', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (inv && inv.status === 'cancelled') { run('DELETE FROM invoices WHERE id = ?', [inv.id]); req.flash('ok', 'Faktúra odstránená.'); return res.redirect('/invoices'); }
  req.flash('err', 'Odstrániť je možné iba stornovanú faktúru.'); res.redirect('/invoices/' + req.params.id);
});
router.post('/:id/reminder', async (req, res) => {
  try { await reminders.sendReminder(Number(req.params.id), parseInt(req.body.level, 10) || 1, true); req.flash('ok', 'Upomienka odoslaná.'); }
  catch (e) { req.flash('err', 'Upomienku sa nepodarilo odoslať: ' + e.message); }
  res.redirect('/invoices/' + req.params.id);
});
router.get('/:id/reminder-preview', (req, res) => {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!inv) return res.redirect('/invoices');
  const r = reminders.buildReminder(inv, parseInt(req.query.level, 10) || 1);
  res.render('invoices/reminder_preview', { title: 'Náhľad upomienky', inv, r, level: parseInt(req.query.level, 10) || 1 });
});
module.exports = router;
