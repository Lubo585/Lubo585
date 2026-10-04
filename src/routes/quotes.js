// Cenové ponuky s prevodom na faktúru
const router = require('express').Router();
const { all, get, run, transaction, getSetting, log } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');
const PDF = require('../services/pdf');
const { t: T } = require('../services/i18n');
const { sendMail } = require('../services/mailer');

const STATUSES = { draft: ['muted', 'Koncept'], sent: ['info', 'Odoslaná'], accepted: ['ok', 'Prijatá'], rejected: ['danger', 'Zamietnutá'], invoiced: ['ok', 'Vyfakturovaná'] };
function nextNumber(date) { const y = (date || U.today()).slice(0, 4); const n = get('SELECT COUNT(*) AS n FROM quotes WHERE date LIKE ?', [y + '%']).n + 1; return `CP${y}${String(n).padStart(3, '0')}`; }
function load(id) {
  const q = get('SELECT q.*, c.name AS client_name, c.address AS client_address, c.email AS client_email, c.invoice_email AS client_invoice_email, s.name AS site_name FROM quotes q JOIN clients c ON c.id=q.client_id LEFT JOIN sites s ON s.id=q.site_id WHERE q.id = ?', [id]);
  if (q) q.items = all('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order, id', [id]);
  return q;
}
router.get('/', (req, res) => {
  const quotes = all('SELECT q.*, c.name AS client_name FROM quotes q JOIN clients c ON c.id=q.client_id ORDER BY q.date DESC, q.id DESC LIMIT 200');
  res.render('quotes/index', { title: 'Cenové ponuky', quotes, STATUSES });
});
const formData = () => ({ clients: all('SELECT id, name, language FROM clients WHERE active = 1 ORDER BY name'), sites: all('SELECT id, client_id, name FROM sites ORDER BY name') });
router.get('/new', (req, res) => res.render('quotes/form', { title: 'Nová cenová ponuka', q: { date: U.today(), valid_until: U.addDays(U.today(), 30), number: nextNumber(), language: 'de', client_id: req.query.client_id || '', items: [{ description: 'Prenájom pracovníka – murár', quantity: 1, unit: 'hod', unit_price: '' }] }, ...formData() }));
router.get('/:id/edit', (req, res) => { const q = load(req.params.id); if (!q) return res.status(404).render('error', { title: 'Chyba', message: 'Ponuka neexistuje' }); res.render('quotes/form', { title: 'Upraviť ponuku ' + q.number, q, ...formData() }); });
router.post('/save', (req, res) => {
  const b = req.body; const items = Object.values(b.items || {}).filter((i) => i.description && i.description.trim());
  const id = transaction(() => {
    let id = b.id;
    const vals = [b.number.trim(), b.client_id, b.site_id || null, b.date, b.valid_until || null, b.note || '', b.language === 'de' ? 'de' : 'sk'];
    if (id) { run('UPDATE quotes SET number=?, client_id=?, site_id=?, date=?, valid_until=?, note=?, language=? WHERE id=?', [...vals, id]); run('DELETE FROM quote_items WHERE quote_id = ?', [id]); }
    else { const r = run("INSERT INTO quotes(number, client_id, site_id, date, valid_until, note, language, status) VALUES (?,?,?,?,?,?,?,'draft')", vals); id = Number(r.lastInsertRowid); log('quote', `Vytvorená cenová ponuka ${b.number}`); }
    let sub = 0;
    items.forEach((i, idx) => { const tot = U.round2(U.num(i.quantity, 1) * U.num(i.unit_price)); sub += tot; run('INSERT INTO quote_items(quote_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?)', [id, i.description.trim(), U.num(i.quantity, 1), i.unit || 'hod', U.num(i.unit_price), tot, idx]); });
    run('UPDATE quotes SET subtotal = ? WHERE id = ?', [U.round2(sub), id]);
    return id;
  });
  req.flash('ok', 'Ponuka uložená.'); res.redirect('/quotes/' + id);
});
router.get('/:id', (req, res) => { const q = load(req.params.id); if (!q) return res.status(404).render('error', { title: 'Chyba', message: 'Ponuka neexistuje' }); res.render('quotes/detail', { title: 'Ponuka ' + q.number, q, STATUSES }); });
router.get('/:id/pdf', async (req, res) => { const q = load(req.params.id); if (!q) return res.status(404).send('Nenájdené'); res.setHeader('Content-Disposition', `inline; filename="ponuka-${q.number}.pdf"`); res.type('application/pdf'); res.send(await PDF.quotePdf(q)); });
router.post('/:id/status', (req, res) => { if (STATUSES[req.body.status]) run('UPDATE quotes SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.redirect('/quotes/' + req.params.id); });
router.post('/:id/send', async (req, res) => {
  const q = load(req.params.id); if (!q) return res.redirect('/quotes');
  const to = (req.body.to || q.client_invoice_email || q.client_email || '').trim();
  if (!to) { req.flash('err', 'Klient nemá e-mail.'); return res.redirect('/quotes/' + q.id); }
  try {
    const L = T(q.language); const pdf = await PDF.quotePdf(q);
    await sendMail({ to, subject: q.language === 'de' ? `Angebot ${q.number}` : `Cenová ponuka ${q.number}`, text: (q.language === 'de' ? `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unser Angebot ${q.number}.\n\nMit freundlichen Grüßen\n` : `Dobrý deň,\n\nv prílohe Vám zasielame cenovú ponuku ${q.number}.\n\nS pozdravom\n`) + getSetting('company_name'), attachments: [{ filename: `${L.quote}-${q.number}.pdf`, content: pdf, contentType: 'application/pdf' }] });
    run("UPDATE quotes SET status = 'sent' WHERE id = ?", [q.id]); req.flash('ok', 'Ponuka odoslaná na ' + to);
  } catch (e) { req.flash('err', 'Odoslanie zlyhalo: ' + e.message); }
  res.redirect('/quotes/' + q.id);
});
router.post('/:id/to-invoice', (req, res) => {
  const q = load(req.params.id); if (!q) return res.redirect('/quotes');
  const client = get('SELECT * FROM clients WHERE id = ?', [q.client_id]); const today = U.today(); const d = INV.clientDefaults(client, today);
  const number = INV.nextInvoiceNumber(today);
  const id = transaction(() => {
    const r = run("INSERT INTO invoices(number, variable_symbol, client_id, site_id, issue_date, delivery_date, due_date, vat_rate, vat_mode, language, reverse_charge, retention_percent, retention_due_date, skonto_percent, skonto_days, withholding_pct, quote_id, status, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'issued',?)",
      [number, number.replace(/\D/g, ''), q.client_id, q.site_id, today, today, d.due_date, d.vat_rate, d.vat_mode, q.language, d.vat_mode === 'domestic_reverse' ? 1 : 0, d.retention_percent, d.retention_due_date, d.skonto_percent, d.skonto_days, d.withholding_pct, q.id, q.note || '']);
    const id = Number(r.lastInsertRowid);
    q.items.forEach((i, idx) => run('INSERT INTO invoice_items(invoice_id, description, quantity, unit, unit_price, sort_order) VALUES (?,?,?,?,?,?)', [id, i.description, i.quantity, i.unit, i.unit_price, idx]));
    run("UPDATE quotes SET status = 'invoiced' WHERE id = ?", [q.id]); INV.recalc(id); log('invoice', `Faktúra ${number} vytvorená z ponuky ${q.number}`); return id;
  });
  req.flash('ok', 'Faktúra vytvorená z ponuky.'); res.redirect('/invoices/' + id);
});
router.post('/:id/delete', (req, res) => { run('DELETE FROM quotes WHERE id = ?', [req.params.id]); req.flash('ok', 'Ponuka odstránená.'); res.redirect('/quotes'); });
module.exports = router;
