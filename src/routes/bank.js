const router = require('express').Router();
const multer = require('multer');
const { all, get, run, getSettings, log } = require('../db');
const U = require('../utils');
const M = require('../services/matching');
const imap = require('../services/imap');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const f = req.query.filter || 'unmatched';
  let where = '1=1';
  if (f === 'unmatched') where = "b.match_status = 'unmatched' AND b.amount > 0";
  else if (f === 'matched') where = "b.match_status IN ('auto','manual')";
  else if (f === 'ignored') where = "b.match_status = 'ignored'";
  else if (f === 'debit') where = 'b.amount < 0';
  const txs = all(`SELECT b.*, i.number AS invoice_number FROM bank_transactions b LEFT JOIN invoices i ON i.id=b.matched_invoice_id WHERE ${where} ORDER BY b.date DESC, b.id DESC LIMIT 300`);
  const counts = { unmatched: get("SELECT COUNT(*) AS n FROM bank_transactions WHERE match_status='unmatched' AND amount > 0").n, matched: get("SELECT COUNT(*) AS n FROM bank_transactions WHERE match_status IN ('auto','manual')").n, ignored: get("SELECT COUNT(*) AS n FROM bank_transactions WHERE match_status='ignored'").n, debit: get('SELECT COUNT(*) AS n FROM bank_transactions WHERE amount < 0').n, all: get('SELECT COUNT(*) AS n FROM bank_transactions').n };
  const imports = all('SELECT * FROM bank_imports ORDER BY id DESC LIMIT 10');
  const s = getSettings();
  res.render('bank/index', { title: 'Banka – párovanie platieb', txs, counts, imports, f, imapEnabled: s.imap_enabled === '1', imapLast: s.imap_last_check, imapErr: s.imap_last_error });
});
router.post('/upload', upload.array('files', 20), (req, res) => {
  let created = 0, matched = 0, total = 0; const errors = [];
  for (const file of req.files || []) {
    try { const r = M.importStatementFile(file.buffer, file.originalname, { source: 'upload' }); created += r.created; matched += r.matched; total += r.total; }
    catch (e) { errors.push(`${file.originalname}: ${e.message}`); run('INSERT INTO bank_imports(filename, source, error) VALUES (?,?,?)', [file.originalname, 'upload', e.message]); }
  }
  if (errors.length) req.flash('err', errors.join(' | '));
  else req.flash('ok', `Načítaných ${total} transakcií, ${created} nových, ${matched} automaticky spárovaných.`);
  res.redirect('/bank');
});
router.post('/check-mail', async (req, res) => {
  try {
    const r = await imap.checkMailbox();
    if (r.skipped) req.flash('warn', 'Sťahovanie z e-mailu nie je zapnuté (Nastavenia → Bankový e-mail).');
    else if (r.errors.length) req.flash('err', 'Chyby: ' + r.errors.join(' | '));
    else req.flash('ok', `Skontrolovaná schránka: ${r.messages} e-mailov, ${r.imported} výpisov, ${r.created} nových transakcií, ${r.matched} spárovaných.`);
  } catch (e) { req.flash('err', e.message); }
  res.redirect('/bank');
});
router.post('/rematch', (req, res) => { const n = M.rematchAll(); req.flash('ok', `Automaticky spárovaných: ${n}.`); res.redirect('/bank'); });
router.get('/:id', (req, res) => {
  const tx = get('SELECT b.*, i.number AS invoice_number FROM bank_transactions b LEFT JOIN invoices i ON i.id=b.matched_invoice_id WHERE b.id = ?', [req.params.id]);
  if (!tx) return res.status(404).render('error', { title: 'Chyba', message: 'Transakcia neexistuje' });
  const candidates = M.findCandidates(tx).slice(0, 10);
  const open = all("SELECT i.id, i.number, i.amount_due, i.paid_amount, i.retention_amount, i.retention_paid, c.name AS client_name FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status IN ('issued','partial') OR (i.status='paid' AND i.retention_amount > i.retention_paid + 0.005) ORDER BY i.issue_date DESC");
  res.render('bank/detail', { title: 'Transakcia', tx, candidates, open });
});
router.post('/:id/match', (req, res) => {
  try { M.matchTransaction(Number(req.params.id), Number(req.body.invoice_id), req.body.kind || 'payment', 'manual', 'Ručne spárované'); req.flash('ok', 'Platba spárovaná.'); }
  catch (e) { req.flash('err', e.message); }
  res.redirect('/bank');
});
router.post('/:id/unmatch', (req, res) => { M.unmatchTransaction(Number(req.params.id)); req.flash('ok', 'Spárovanie zrušené.'); res.redirect('/bank/' + req.params.id); });
router.post('/:id/ignore', (req, res) => { M.ignoreTransaction(Number(req.params.id), req.body.note || 'Ignorované'); req.flash('ok', 'Transakcia označená ako ignorovaná.'); res.redirect('/bank'); });
router.post('/:id/expense', (req, res) => {
  // vytvorenie nákladu z odchádzajúcej platby
  const tx = get('SELECT * FROM bank_transactions WHERE id = ?', [req.params.id]);
  if (!tx || tx.amount >= 0) return res.redirect('/bank');
  const total = Math.abs(tx.amount); const vat = U.num(req.body.vat_rate);
  run('INSERT INTO expenses(date, category, description, supplier, amount_net, vat_rate, amount_total, paid, note) VALUES (?,?,?,?,?,?,?,1,?)', [tx.date, req.body.category || 'Ostatné', tx.message || tx.counterparty_name || 'Platba z banky', tx.counterparty_name || '', U.round2(total / (1 + vat / 100)), vat, total, 'Z bankovej transakcie #' + tx.id]);
  run("UPDATE bank_transactions SET match_status='ignored', match_note='Zaevidované ako náklad' WHERE id = ?", [tx.id]);
  log('expense', `Náklad z bankovej transakcie: ${tx.counterparty_name || ''} ${U.money(total)}`);
  req.flash('ok', 'Náklad vytvorený.');
  res.redirect('/bank?filter=debit');
});
module.exports = router;
