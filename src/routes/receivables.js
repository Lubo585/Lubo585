// Staré pohľadávky – otvorené faktúry a doplatky z minulých rokov
const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const RC = require('../services/receivables');

const BASE = `SELECT r.*, c.name AS client_name, u.name AS created_by_name, u.username AS created_by_user,
    (SELECT COUNT(*) FROM old_receivable_notes n WHERE n.receivable_id = r.id AND n.type = 'comment') AS comments
  FROM old_receivables r LEFT JOIN clients c ON c.id = r.client_id LEFT JOIN users u ON u.id = r.created_by`;

function formData() {
  return {
    clients: all('SELECT id, name FROM clients ORDER BY name'),
    customers: all('SELECT customer_name AS name, COUNT(*) AS n FROM old_receivables GROUP BY customer_name ORDER BY n DESC, name'),
    STATUSES: RC.STATUSES,
  };
}
function parseForm(b) {
  const client = b.client_id ? get('SELECT id, name FROM clients WHERE id = ?', [b.client_id]) : null;
  const customer = (b.customer_name || '').trim() || (client ? client.name : '');
  const issue = b.issue_date || null;
  return {
    client_id: client ? client.id : null, customer_name: customer, variable_symbol: (b.variable_symbol || '').trim().replace(/\s+/g, '') || null,
    invoice_number: (b.invoice_number || '').trim() || null, year: parseInt(b.year, 10) || (issue ? parseInt(issue.slice(0, 4), 10) : null) || null,
    issue_date: issue, due_date: b.due_date || null, amount: U.round2(U.num(b.amount)), currency: (b.currency || 'EUR').trim().toUpperCase() || 'EUR',
    description: (b.description || '').trim(), reason: (b.reason || '').trim(), status: RC.STATUSES[b.status] ? b.status : 'open',
    next_action: (b.next_action || '').trim() || null, next_action_date: b.next_action_date || null, note: (b.note || '').trim() || null,
  };
}

router.get('/', (req, res) => {
  const f = req.query.filter || 'open';
  const q = (req.query.q || '').trim();
  const customer = (req.query.customer || '').trim();
  const year = req.query.year || '';
  const params = []; const where = [];
  if (f === 'open') where.push(`r.status IN (${RC.OPEN_STATUSES.map(() => '?').join(',')})`), params.push(...RC.OPEN_STATUSES);
  else if (f === 'paid') where.push("r.status = 'paid'");
  else if (f === 'written_off') where.push("r.status = 'written_off'");
  else if (RC.STATUSES[f]) where.push('r.status = ?'), params.push(f);
  if (q) { where.push('(r.customer_name LIKE ? OR r.variable_symbol LIKE ? OR r.invoice_number LIKE ? OR r.description LIKE ? OR r.reason LIKE ? OR c.name LIKE ?)'); for (let i = 0; i < 6; i++) params.push('%' + q + '%'); }
  if (customer) { where.push('r.customer_name = ?'); params.push(customer); }
  if (year) { where.push('r.year = ?'); params.push(parseInt(year, 10)); }
  const rows = all(`${BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY CASE WHEN r.status IN ('paid','written_off') THEN 1 ELSE 0 END, r.customer_name, COALESCE(r.year, 0), COALESCE(r.due_date, r.issue_date, ''), r.id`, params);
  const sums = { amount: U.round2(rows.reduce((s, r) => s + r.amount, 0)), paid: U.round2(rows.reduce((s, r) => s + r.paid_amount, 0)), remaining: U.round2(rows.reduce((s, r) => s + (RC.isOpen(r) ? RC.remaining(r) : 0), 0)) };
  const byCustomer = all(`SELECT customer_name, COUNT(*) AS n, SUM(amount - paid_amount) AS rem FROM old_receivables WHERE status IN (${RC.OPEN_STATUSES.map(() => '?').join(',')}) GROUP BY customer_name ORDER BY rem DESC`, RC.OPEN_STATUSES);
  const years = all('SELECT DISTINCT year FROM old_receivables WHERE year IS NOT NULL ORDER BY year DESC').map((r) => r.year);
  const counts = {};
  for (const r of all('SELECT status, COUNT(*) AS n FROM old_receivables GROUP BY status')) counts[r.status] = r.n;
  counts.open_all = RC.OPEN_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0);
  res.render('receivables/index', { title: 'Staré pohľadávky', rows, sums, byCustomer, years, counts, kpi: RC.summary(), f, q, customer, year, ...formData() });
});

router.get('/export.csv', (req, res) => {
  const rows = all(`${BASE} ORDER BY r.customer_name, r.year, r.id`);
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [['Zákazník', 'VS', 'Číslo faktúry', 'Rok', 'Vystavená', 'Splatnosť', 'Suma', 'Uhradené', 'Zostáva', 'Mena', 'Stav', 'Za čo', 'Prečo nebolo uhradené', 'Ďalší krok', 'Termín kroku', 'Poznámka'].map(esc).join(';')];
  for (const r of rows) lines.push([r.customer_name, r.variable_symbol, r.invoice_number, r.year, r.issue_date, r.due_date, r.amount.toFixed(2).replace('.', ','), r.paid_amount.toFixed(2).replace('.', ','), RC.remaining(r).toFixed(2).replace('.', ','), r.currency, RC.STATUSES[r.status] ? RC.STATUSES[r.status][0] : r.status, r.description, r.reason, r.next_action, r.next_action_date, r.note].map(esc).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="stare-pohladavky.csv"');
  res.send('﻿' + lines.join('\r\n'));
});

router.get('/new', (req, res) => res.render('receivables/form', { title: 'Nová stará pohľadávka', r: { status: 'open', currency: 'EUR', client_id: req.query.client_id || '', customer_name: req.query.customer || '' }, ...formData() }));
router.get('/:id/edit', (req, res) => {
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).render('error', { title: 'Chyba', message: 'Pohľadávka neexistuje' });
  res.render('receivables/form', { title: 'Upraviť pohľadávku', r, ...formData() });
});
router.post('/save', (req, res) => {
  const d = parseForm(req.body);
  const me = req.session.user.id;
  if (!d.customer_name) { req.flash('err', 'Zadajte zákazníka.'); return res.redirect(req.body.id ? `/receivables/${req.body.id}/edit` : '/receivables/new'); }
  if (!(d.amount > 0)) { req.flash('err', 'Zadajte sumu väčšiu ako 0.'); return res.redirect(req.body.id ? `/receivables/${req.body.id}/edit` : '/receivables/new'); }
  let id = req.body.id;
  if (id) {
    const old = get('SELECT * FROM old_receivables WHERE id = ?', [id]);
    if (!old) return res.redirect('/receivables');
    run(`UPDATE old_receivables SET client_id=?, customer_name=?, variable_symbol=?, invoice_number=?, year=?, issue_date=?, due_date=?, amount=?, currency=?, description=?, reason=?, status=?, next_action=?, next_action_date=?, note=?, updated_at=datetime('now') WHERE id=?`,
      [d.client_id, d.customer_name, d.variable_symbol, d.invoice_number, d.year, d.issue_date, d.due_date, d.amount, d.currency, d.description, d.reason, d.status, d.next_action, d.next_action_date, d.note, id]);
    if (old.status !== d.status) run("INSERT INTO old_receivable_notes(receivable_id, user_id, type, text) VALUES (?,?,'status',?)", [id, me, 'Stav zmenený na: ' + RC.STATUSES[d.status][0]]);
    RC.refresh(id);
    req.flash('ok', 'Pohľadávka uložená.');
  } else {
    const r = run(`INSERT INTO old_receivables(client_id, customer_name, variable_symbol, invoice_number, year, issue_date, due_date, amount, currency, description, reason, status, next_action, next_action_date, note, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.client_id, d.customer_name, d.variable_symbol, d.invoice_number, d.year, d.issue_date, d.due_date, d.amount, d.currency, d.description, d.reason, d.status, d.next_action, d.next_action_date, d.note, me]);
    id = Number(r.lastInsertRowid);
    run("INSERT INTO old_receivable_notes(receivable_id, user_id, type, text) VALUES (?,?,'status','Pohľadávka zaevidovaná')", [id, me]);
    const paid = U.round2(U.num(req.body.paid_amount));
    if (paid > 0) RC.addPayment({ receivableId: id, date: req.body.paid_date || U.today(), amount: Math.min(paid, d.amount), note: 'Úhrada pred zaevidovaním', userId: me });
    else RC.refresh(id);
    log('receivable', `Zaevidovaná stará pohľadávka ${d.customer_name} VS ${d.variable_symbol || '–'} ${U.money(d.amount)}`);
    req.flash('ok', 'Pohľadávka zaevidovaná.');
  }
  res.redirect('/receivables/' + id);
});

router.get('/:id', (req, res) => {
  const r = get(`${BASE} WHERE r.id = ?`, [req.params.id]);
  if (!r) return res.status(404).render('error', { title: 'Chyba', message: 'Pohľadávka neexistuje' });
  const payments = all('SELECT p.*, b.counterparty_name, b.date AS bank_date FROM old_receivable_payments p LEFT JOIN bank_transactions b ON b.id = p.bank_transaction_id WHERE p.receivable_id = ? ORDER BY p.date, p.id', [r.id]);
  const notes = all('SELECT n.*, u.name, u.username FROM old_receivable_notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.receivable_id = ? ORDER BY n.id', [r.id]);
  const others = all(`${BASE} WHERE r.customer_name = ? AND r.id != ? ORDER BY r.year, r.id`, [r.customer_name, r.id]);
  res.render('receivables/detail', { title: `${r.customer_name} – VS ${r.variable_symbol || '–'}`, r, payments, notes, others, STATUSES: RC.STATUSES, remaining: RC.remaining(r) });
});
router.post('/:id/payment', (req, res) => {
  try { RC.addPayment({ receivableId: Number(req.params.id), date: req.body.date, amount: req.body.amount, note: req.body.note || '', userId: req.session.user.id }); req.flash('ok', 'Úhrada zaevidovaná.'); }
  catch (e) { req.flash('err', e.message); }
  res.redirect('/receivables/' + req.params.id);
});
router.post('/:id/payment/:pid/delete', (req, res) => {
  const p = get('SELECT * FROM old_receivable_payments WHERE id = ? AND receivable_id = ?', [req.params.pid, req.params.id]);
  if (p && p.bank_transaction_id) { req.flash('err', 'Úhrada pochádza z banky – zrušte spárovanie v sekcii Banka a platby.'); return res.redirect('/receivables/' + req.params.id); }
  if (p) { run('DELETE FROM old_receivable_payments WHERE id = ?', [p.id]); RC.refresh(p.receivable_id); req.flash('ok', 'Úhrada odstránená.'); }
  res.redirect('/receivables/' + req.params.id);
});
router.post('/:id/status', (req, res) => {
  try { RC.setStatus(Number(req.params.id), req.body.status, req.body.text || '', req.session.user.id); req.flash('ok', 'Stav zmenený.'); }
  catch (e) { req.flash('err', e.message); }
  res.redirect('/receivables/' + req.params.id);
});
router.post('/:id/note', (req, res) => {
  const text = (req.body.text || '').trim();
  if (text) { run("INSERT INTO old_receivable_notes(receivable_id, user_id, type, text) VALUES (?,?,'comment',?)", [req.params.id, req.session.user.id, text]); run("UPDATE old_receivables SET updated_at=datetime('now') WHERE id=?", [req.params.id]); }
  res.redirect('/receivables/' + req.params.id);
});
router.post('/:id/delete', (req, res) => {
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [req.params.id]);
  if (r) {
    run("UPDATE bank_transactions SET matched_receivable_id = NULL, match_status = 'unmatched', match_note = NULL WHERE matched_receivable_id = ?", [r.id]);
    run('DELETE FROM old_receivables WHERE id = ?', [r.id]);
    log('receivable', `Odstránená stará pohľadávka ${r.customer_name} VS ${r.variable_symbol || '–'}`);
    req.flash('ok', 'Pohľadávka odstránená.');
  }
  res.redirect('/receivables');
});

module.exports = router;
