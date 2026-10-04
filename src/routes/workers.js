const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');
const C = require('../services/compliance');

router.get('/', (req, res) => {
  const showAll = req.query.all === '1';
  const workers = all(`SELECT w.*, (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE r.worker_id=w.id AND t.week_start >= ?) AS hours_month,
    (SELECT MIN(valid_to) FROM worker_documents d WHERE d.worker_id = w.id AND d.valid_to IS NOT NULL AND d.valid_to >= ?) AS next_expiry,
    (SELECT COUNT(*) FROM worker_documents d WHERE d.worker_id = w.id AND d.valid_to IS NOT NULL AND d.valid_to < ?) AS expired_docs,
    (SELECT valid_to FROM worker_documents d WHERE d.worker_id = w.id AND d.type = 'a1' ORDER BY valid_to DESC LIMIT 1) AS a1_until,
    (SELECT s.name FROM assignments a JOIN sites s ON s.id = a.site_id WHERE a.worker_id = w.id AND a.type = 'work' AND a.date_from <= ? AND a.date_to >= ? ORDER BY a.id DESC LIMIT 1) AS current_site
    FROM workers w ${showAll ? '' : 'WHERE w.active = 1'} ORDER BY w.last_name, w.first_name`, [U.monthStart(), U.today(), U.today(), U.today(), U.today()]);
  res.render('workers/index', { title: 'Pracovníci', workers, showAll });
});
router.get('/new', (req, res) => res.render('workers/form', { title: 'Nový pracovník', w: { active: 1, hourly_cost: 0, per_diem: 1, eu_citizen: 0 } }));
router.get('/:id/edit', (req, res) => {
  const w = get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!w) return res.status(404).render('error', { title: 'Chyba', message: 'Pracovník neexistuje' });
  res.render('workers/form', { title: 'Upraviť pracovníka', w });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const vals = [b.first_name.trim(), b.last_name.trim(), b.nationality || '', b.position || '', b.phone || '', b.email || '', U.num(b.hourly_cost), b.hourly_rate ? U.num(b.hourly_rate) : null, b.active ? 1 : 0, b.note || '',
    b.birth_date || null, b.address || '', b.id_number || '', b.iban || '', b.wage_rate ? U.num(b.wage_rate) : null, b.lohngruppe || '', b.german_level || '', b.emergency_contact || '', b.sizes || '', b.per_diem ? 1 : 0, U.num(b.lodging_deduction), b.eu_citizen ? 1 : 0, b.hired_at || null, b.contract_type || ''];
  const cols = 'first_name=?, last_name=?, nationality=?, position=?, phone=?, email=?, hourly_cost=?, hourly_rate=?, active=?, note=?, birth_date=?, address=?, id_number=?, iban=?, wage_rate=?, lohngruppe=?, german_level=?, emergency_contact=?, sizes=?, per_diem=?, lodging_deduction=?, eu_citizen=?, hired_at=?, contract_type=?';
  let id = b.id;
  if (id) { run(`UPDATE workers SET ${cols} WHERE id=?`, [...vals, id]); req.flash('ok', 'Pracovník uložený.'); }
  else { const r = run(`INSERT INTO workers(first_name, last_name, nationality, position, phone, email, hourly_cost, hourly_rate, active, note, birth_date, address, id_number, iban, wage_rate, lohngruppe, german_level, emergency_contact, sizes, per_diem, lodging_deduction, eu_citizen, hired_at, contract_type) VALUES (${vals.map(() => '?').join(',')})`, vals); id = r.lastInsertRowid; req.flash('ok', 'Pracovník pridaný.'); log('worker', `Pridaný pracovník ${b.last_name} ${b.first_name}`); }
  res.redirect('/workers/' + id);
});
router.get('/:id', (req, res) => {
  const w = get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!w) return res.status(404).render('error', { title: 'Chyba', message: 'Pracovník neexistuje' });
  const today = U.today();
  const docs = all('SELECT * FROM worker_documents WHERE worker_id = ? ORDER BY CASE WHEN valid_to IS NULL THEN 1 ELSE 0 END, valid_to', [w.id]).map((d) => ({ ...d, type_label: C.DOC_TYPES[d.type] || d.type, days_left: d.valid_to ? U.diffDays(d.valid_to, today) : null }));
  const postings = all('SELECT p.*, s.name AS site_name, c.name AS client_name FROM postings p LEFT JOIN sites s ON s.id=p.site_id LEFT JOIN clients c ON c.id=p.client_id WHERE p.worker_id = ? ORDER BY p.date_from DESC', [w.id]);
  const assignments = all('SELECT a.*, s.name AS site_name FROM assignments a LEFT JOIN sites s ON s.id=a.site_id WHERE a.worker_id = ? ORDER BY a.date_from DESC LIMIT 30', [w.id]);
  const sheets = all(`SELECT t.id, t.week_start, t.status, s.name AS site_name, (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) AS hours FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN sites s ON s.id=t.site_id WHERE r.worker_id = ? ORDER BY t.week_start DESC LIMIT 26`, [w.id]);
  const aug = C.augStatus().filter((a) => a.worker_id === w.id);
  const settlements = all('SELECT * FROM settlements WHERE worker_id = ? ORDER BY month DESC LIMIT 12', [w.id]);
  const transactions = all('SELECT * FROM worker_transactions WHERE worker_id = ? ORDER BY date DESC, id DESC LIMIT 30', [w.id]);
  const stays = all('SELECT ls.*, l.name AS lodging_name, l.city FROM lodging_stays ls JOIN lodgings l ON l.id=ls.lodging_id WHERE ls.worker_id = ? ORDER BY ls.date_from DESC LIMIT 10', [w.id]);
  const sites = all("SELECT s.id, s.name, c.name AS client_name FROM sites s JOIN clients c ON c.id=s.client_id WHERE s.status != 'finished' ORDER BY c.name, s.name");
  const clients = all('SELECT id, name FROM clients WHERE active = 1 ORDER BY name');
  const stats = { hours_year: U.round2(sheets.filter((s) => s.week_start >= today.slice(0, 4) + '-01-01').reduce((a, s) => a + s.hours, 0)), hours_total: get('SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) AS h FROM timesheet_rows r WHERE r.worker_id = ?', [w.id]).h, balance: U.round2(transactions.filter((t) => !t.settlement_id).reduce((a, t) => a + (t.type === 'advance' ? -t.amount : t.type === 'deduction' ? -t.amount : t.amount), 0)) };
  res.render('workers/detail', { title: `${w.last_name} ${w.first_name}`, w, docs, postings, assignments, sheets, aug, settlements, transactions, stays, sites, clients, stats, DOC_TYPES: C.DOC_TYPES, ASSIGNMENT_TYPES: C.ASSIGNMENT_TYPES });
});
// doklady
router.post('/:id/documents/save', (req, res) => {
  const b = req.body;
  const vals = [b.type, b.number || '', b.issued_by || '', b.valid_from || null, b.valid_to || null, b.note || ''];
  if (b.doc_id) run('UPDATE worker_documents SET type=?, number=?, issued_by=?, valid_from=?, valid_to=?, note=? WHERE id=? AND worker_id=?', [...vals, b.doc_id, req.params.id]);
  else run('INSERT INTO worker_documents(type, number, issued_by, valid_from, valid_to, note, worker_id) VALUES (?,?,?,?,?,?,?)', [...vals, req.params.id]);
  req.flash('ok', 'Doklad uložený.'); res.redirect('/workers/' + req.params.id + '#docs');
});
router.post('/:id/documents/:did/delete', (req, res) => { run('DELETE FROM worker_documents WHERE id = ? AND worker_id = ?', [req.params.did, req.params.id]); res.redirect('/workers/' + req.params.id + '#docs'); });
// hlásenia vyslania
router.post('/:id/postings/save', (req, res) => {
  const b = req.body;
  const site = b.site_id ? get('SELECT client_id FROM sites WHERE id = ?', [b.site_id]) : null;
  const vals = [b.site_id || null, site ? site.client_id : (b.client_id || null), b.date_from || null, b.date_to || null, b.notified_at || null, b.portal_ref || '', b.note || ''];
  if (b.posting_id) run('UPDATE postings SET site_id=?, client_id=?, date_from=?, date_to=?, notified_at=?, portal_ref=?, note=? WHERE id=? AND worker_id=?', [...vals, b.posting_id, req.params.id]);
  else run('INSERT INTO postings(site_id, client_id, date_from, date_to, notified_at, portal_ref, note, worker_id) VALUES (?,?,?,?,?,?,?,?)', [...vals, req.params.id]);
  req.flash('ok', 'Vyslanie uložené.'); res.redirect('/workers/' + req.params.id + '#postings');
});
router.post('/:id/postings/:pid/delete', (req, res) => { run('DELETE FROM postings WHERE id = ? AND worker_id = ?', [req.params.pid, req.params.id]); res.redirect('/workers/' + req.params.id + '#postings'); });
// zálohy / zrážky / bonusy
router.post('/:id/transactions/add', (req, res) => {
  const b = req.body; const amt = U.num(b.amount);
  if (amt > 0 && ['advance', 'deduction', 'bonus'].includes(b.type)) { run('INSERT INTO worker_transactions(worker_id, date, type, description, amount, created_by) VALUES (?,?,?,?,?,?)', [req.params.id, b.date || U.today(), b.type, b.description || '', amt, req.session.user.id]); req.flash('ok', 'Záznam pridaný.'); }
  res.redirect('/workers/' + req.params.id + '#money');
});
router.post('/:id/transactions/:tid/delete', (req, res) => { run('DELETE FROM worker_transactions WHERE id = ? AND worker_id = ? AND settlement_id IS NULL', [req.params.tid, req.params.id]); res.redirect('/workers/' + req.params.id + '#money'); });
router.post('/:id/delete', (req, res) => {
  const used = get('SELECT COUNT(*) AS n FROM timesheet_rows WHERE worker_id = ?', [req.params.id]).n;
  if (used) { run('UPDATE workers SET active = 0 WHERE id = ?', [req.params.id]); req.flash('warn', 'Pracovník má záznamy v hodinových lístkoch, bol iba deaktivovaný.'); }
  else { run('DELETE FROM workers WHERE id = ?', [req.params.id]); req.flash('ok', 'Pracovník odstránený.'); }
  res.redirect('/workers');
});
module.exports = router;
