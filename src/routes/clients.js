const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');

const VAT_MODES = { standard: 'Štandardne s DPH (SK klient)', eu_reverse: 'Prenesenie DPH v EÚ – klient v DE/AT/… (§ 15 ods. 1 ZDPH, Art. 196 smernice)', domestic_reverse: 'Tuzemské prenesenie – stavebné práce SK (§ 69 ods. 12 písm. j)', exempt: 'Bez DPH (neplatiteľ)' };
const CONTRACT_TYPES = { AUG: 'Zmluva o prenechaní zamestnancov (AÜG / Arbeitnehmerüberlassungsvertrag)', WERK: 'Zmluva o dielo (Werkvertrag)', RAHMEN: 'Rámcová zmluva (Rahmenvertrag)', NDA: 'Mlčanlivosť', OTHER: 'Iná' };

router.get('/', (req, res) => {
  const clients = all(`SELECT c.*, (SELECT COUNT(*) FROM sites s WHERE s.client_id=c.id AND s.status != 'finished') AS sites_count,
    (SELECT COALESCE(SUM(amount_due - paid_amount),0) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('issued','partial')) AS open_amount,
    (SELECT COUNT(*) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('issued','partial') AND i.due_date < ?) AS overdue_count
    FROM clients c ORDER BY c.name`, [U.today()]);
  res.render('clients/index', { title: 'Klienti (odberatelia)', clients });
});
const formData = () => ({ VAT_MODES, CONTRACT_TYPES });
router.get('/new', (req, res) => res.render('clients/form', { title: 'Nový klient', c: { due_days: Number(res.locals.settings.default_due_days) || 14, active: 1, retention_percent: 0, skonto_percent: 0, country: 'DE', vat_mode: 'eu_reverse', language: 'de' }, ...formData() }));
router.get('/:id', (req, res) => {
  const c = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).render('error', { title: 'Chyba', message: 'Klient neexistuje' });
  const sites = all("SELECT * FROM sites WHERE client_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, name", [c.id]);
  const invoices = all('SELECT * FROM invoices WHERE client_id = ? ORDER BY issue_date DESC, id DESC LIMIT 50', [c.id]);
  const rates = all('SELECT * FROM client_rates WHERE client_id = ? ORDER BY profession', [c.id]);
  const contracts = all('SELECT * FROM contracts WHERE client_id = ? ORDER BY valid_from DESC', [c.id]);
  const quotes = all('SELECT * FROM quotes WHERE client_id = ? ORDER BY date DESC LIMIT 10', [c.id]);
  res.render('clients/detail', { title: c.name, c, sites, invoices, rates, contracts, quotes, ...formData() });
});
router.get('/:id/edit', (req, res) => {
  const c = get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).render('error', { title: 'Chyba', message: 'Klient neexistuje' });
  res.render('clients/form', { title: 'Upraviť klienta', c, ...formData() });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const vals = [b.name.trim(), b.ico || '', b.dic || '', b.ic_dph || '', b.address || '', b.email || '', b.phone || '', b.contact_person || '', parseInt(b.due_days, 10) || 14,
    U.num(b.retention_percent), parseInt(b.retention_months, 10) || 0, U.num(b.skonto_percent), parseInt(b.skonto_days, 10) || 0, b.vat_mode === 'domestic_reverse' ? 1 : 0, b.note || '', b.active ? 1 : 0,
    (b.country || 'SK').toUpperCase().slice(0, 2), VAT_MODES[b.vat_mode] ? b.vat_mode : 'standard', b.register || '', b.language === 'de' ? 'de' : 'sk', b.soka_bau ? 1 : 0, b.bauabzugsteuer ? 1 : 0, b.invoice_email || '', b.payment_note || '', b.aug_customer_number || ''];
  const cols = 'name=?, ico=?, dic=?, ic_dph=?, address=?, email=?, phone=?, contact_person=?, due_days=?, retention_percent=?, retention_months=?, skonto_percent=?, skonto_days=?, reverse_charge=?, note=?, active=?, country=?, vat_mode=?, register=?, language=?, soka_bau=?, bauabzugsteuer=?, invoice_email=?, payment_note=?, aug_customer_number=?';
  let id = b.id;
  if (id) { run(`UPDATE clients SET ${cols} WHERE id=?`, [...vals, id]); req.flash('ok', 'Klient uložený.'); }
  else { const r = run(`INSERT INTO clients(name, ico, dic, ic_dph, address, email, phone, contact_person, due_days, retention_percent, retention_months, skonto_percent, skonto_days, reverse_charge, note, active, country, vat_mode, register, language, soka_bau, bauabzugsteuer, invoice_email, payment_note, aug_customer_number) VALUES (${vals.map(() => '?').join(',')})`, vals); id = r.lastInsertRowid; req.flash('ok', 'Klient pridaný.'); log('client', `Pridaný klient ${b.name}`); }
  res.redirect('/clients/' + id);
});
// cenník
router.post('/:id/rates/save', (req, res) => {
  const b = req.body;
  const vals = [b.profession.trim(), U.num(b.rate), U.num(b.overtime_pct, 25), U.num(b.saturday_pct, 25), U.num(b.sunday_pct, 50), U.num(b.night_pct, 25), b.valid_from || null, b.note || ''];
  if (b.rate_id) run('UPDATE client_rates SET profession=?, rate=?, overtime_pct=?, saturday_pct=?, sunday_pct=?, night_pct=?, valid_from=?, note=? WHERE id=? AND client_id=?', [...vals, b.rate_id, req.params.id]);
  else run('INSERT INTO client_rates(profession, rate, overtime_pct, saturday_pct, sunday_pct, night_pct, valid_from, note, client_id) VALUES (?,?,?,?,?,?,?,?,?)', [...vals, req.params.id]);
  req.flash('ok', 'Cenník uložený.'); res.redirect('/clients/' + req.params.id + '#rates');
});
router.post('/:id/rates/:rid/delete', (req, res) => { run('DELETE FROM client_rates WHERE id = ? AND client_id = ?', [req.params.rid, req.params.id]); res.redirect('/clients/' + req.params.id + '#rates'); });
// zmluvy
router.post('/:id/contracts/save', (req, res) => {
  const b = req.body;
  const vals = [CONTRACT_TYPES[b.type] ? b.type : 'OTHER', b.number || '', b.signed_at || null, b.valid_from || null, b.valid_to || null, b.note || ''];
  if (b.contract_id) run('UPDATE contracts SET type=?, number=?, signed_at=?, valid_from=?, valid_to=?, note=? WHERE id=? AND client_id=?', [...vals, b.contract_id, req.params.id]);
  else run('INSERT INTO contracts(type, number, signed_at, valid_from, valid_to, note, client_id) VALUES (?,?,?,?,?,?,?)', [...vals, req.params.id]);
  req.flash('ok', 'Zmluva uložená.'); res.redirect('/clients/' + req.params.id + '#contracts');
});
router.post('/:id/contracts/:cid/delete', (req, res) => { run('DELETE FROM contracts WHERE id = ? AND client_id = ?', [req.params.cid, req.params.id]); res.redirect('/clients/' + req.params.id + '#contracts'); });
module.exports = router;
module.exports.VAT_MODES = VAT_MODES;
