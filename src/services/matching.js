// Automatické párovanie bankových transakcií s vystavenými faktúrami
const { all, get, run, transaction, getSetting, log } = require('../db');
const U = require('../utils');
const INV = require('./invoices');
const { parseStatement } = require('./bankparser');
const RC = require('./receivables');

const simplify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(s\.?r\.?o\.?|a\.?s\.?|spol|sro|as)\b/g, '').replace(/[^a-z0-9]/g, '');

function importTransactions(transactions, meta = {}) {
  return transaction(() => {
    const res = run('INSERT INTO bank_imports(filename, source, email_subject, email_from, transactions_count) VALUES (?,?,?,?,?)',
      [meta.filename || null, meta.source || 'upload', meta.subject || null, meta.from || null, transactions.length]);
    const importId = Number(res.lastInsertRowid);
    let created = 0, matched = 0;
    for (const t of transactions) {
      if (get('SELECT id FROM bank_transactions WHERE hash = ?', [t.hash])) continue;
      const r = run(`INSERT INTO bank_transactions(hash, import_id, date, amount, currency, counterparty_name, counterparty_iban, variable_symbol, specific_symbol, constant_symbol, message, bank_reference)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [t.hash, importId, t.date, t.amount, t.currency, t.counterparty_name, t.counterparty_iban, t.variable_symbol, t.specific_symbol, t.constant_symbol, t.message, t.bank_reference]);
      created++;
      if (autoMatch(Number(r.lastInsertRowid))) matched++;
    }
    run('UPDATE bank_imports SET new_count = ? WHERE id = ?', [created, importId]);
    log('bank', `Import výpisu (${meta.source || 'upload'}${meta.filename ? ': ' + meta.filename : ''}): ${transactions.length} transakcií, ${created} nových, ${matched} automaticky spárovaných`);
    return { importId, total: transactions.length, created, matched };
  });
}

function importStatementFile(buffer, filename, meta = {}) {
  const parsed = parseStatement(buffer, filename);
  return { format: parsed.format, ...importTransactions(parsed.transactions, { ...meta, filename }) };
}

// Kandidáti na spárovanie transakcie
function findCandidates(tx) {
  const tol = Number(getSetting('match_amount_tolerance')) || 0.02;
  const open = all(`SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id
    WHERE i.status IN ('issued','partial','paid') ORDER BY i.issue_date DESC`);
  const out = [];
  for (const inv of open) {
    const rem = INV.remaining(inv);
    const retRem = INV.retentionRemaining(inv);
    const skontoTarget = inv.skonto_percent > 0 ? U.round2(inv.amount_due - inv.skonto_amount - inv.paid_amount) : null;
    let score = 0; const reasons = [];
    const vsMatch = tx.variable_symbol && (tx.variable_symbol === String(inv.variable_symbol || '').replace(/^0+/, '') || tx.variable_symbol === inv.number.replace(/\D/g, '').replace(/^0+/, ''));
    const msgMatch = !vsMatch && tx.message && inv.number && tx.message.includes(inv.number);
    if (vsMatch) { score += 60; reasons.push('VS'); }
    if (msgMatch) { score += 40; reasons.push('číslo faktúry v správe'); }
    if (tx.counterparty_name && simplify(tx.counterparty_name) && simplify(inv.client_name) && (simplify(tx.counterparty_name).includes(simplify(inv.client_name)) || simplify(inv.client_name).includes(simplify(tx.counterparty_name)))) { score += 20; reasons.push('názov klienta'); }
    let kind = null;
    if (rem > 0 && Math.abs(tx.amount - rem) <= tol) { score += 30; reasons.push('presná suma'); kind = 'payment'; }
    else if (rem > 0 && skontoTarget !== null && skontoTarget > 0 && Math.abs(tx.amount - skontoTarget) <= tol) { score += 30; reasons.push('suma so skontom'); kind = 'payment'; }
    else if (retRem > 0 && Math.abs(tx.amount - retRem) <= tol) { score += 30; reasons.push('suma zádržného'); kind = 'retention'; }
    else if (rem > 0 && tx.amount < rem) { score += 5; reasons.push('čiastočná úhrada'); kind = 'payment'; }
    else if (rem <= 0 && retRem > 0 && tx.amount <= retRem + tol) { score += 5; kind = 'retention'; }
    else if (rem > 0 && tx.amount > rem) { score -= 10; reasons.push('suma vyššia ako zostatok'); kind = 'payment'; }
    else if (rem <= 0 && retRem <= 0) { score -= 40; kind = 'payment'; }
    if (score > 0 && kind) out.push({ invoice: inv, score, reasons, kind, remaining: rem, retentionRemaining: retRem });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Kandidáti medzi starými pohľadávkami (faktúry z minulých rokov mimo aplikácie)
function findOldReceivableCandidates(tx) {
  const tol = Number(getSetting('match_amount_tolerance')) || 0.02;
  const open = all(`SELECT * FROM old_receivables WHERE status IN (${RC.OPEN_STATUSES.map(() => '?').join(',')}) ORDER BY year, id`, RC.OPEN_STATUSES);
  const out = [];
  for (const r of open) {
    const rem = RC.remaining(r);
    if (rem <= 0) continue;
    let score = 0; const reasons = [];
    const vsMatch = tx.variable_symbol && String(r.variable_symbol || '').replace(/^0+/, '') && tx.variable_symbol.replace(/^0+/, '') === String(r.variable_symbol).replace(/^0+/, '');
    const msgMatch = !vsMatch && tx.message && ((r.invoice_number && tx.message.includes(r.invoice_number)) || (r.variable_symbol && tx.message.includes(r.variable_symbol)));
    if (vsMatch) { score += 60; reasons.push('VS'); }
    if (msgMatch) { score += 40; reasons.push('číslo v správe'); }
    if (tx.counterparty_name && simplify(tx.counterparty_name) && simplify(r.customer_name) && (simplify(tx.counterparty_name).includes(simplify(r.customer_name)) || simplify(r.customer_name).includes(simplify(tx.counterparty_name)))) { score += 20; reasons.push('názov zákazníka'); }
    if (Math.abs(tx.amount - rem) <= tol) { score += 30; reasons.push('presná suma'); }
    else if (tx.amount < rem) { score += 5; reasons.push('čiastočná úhrada'); }
    else { score -= 10; reasons.push('suma vyššia ako zostatok'); }
    if (score > 0) out.push({ receivable: r, score, reasons, remaining: rem });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Automatické spárovanie: spáruje iba pri jednoznačnom kandidátovi
function autoMatch(txId) {
  const tx = get('SELECT * FROM bank_transactions WHERE id = ?', [txId]);
  if (!tx || tx.amount <= 0 || tx.match_status !== 'unmatched') return false;
  const cands = findCandidates(tx);
  const isConfident = (list) => { if (!list.length) return false; const best = list[0], second = list[1]; return best.score >= 80 || (best.score >= 60 && (!second || second.score < best.score - 20)); };
  if (isConfident(cands)) { matchTransaction(txId, cands[0].invoice.id, cands[0].kind, 'auto', `Auto: ${cands[0].reasons.join(', ')}`); return true; }
  // žiadna jednoznačná faktúra → skús staré pohľadávky z minulých rokov
  const olds = findOldReceivableCandidates(tx);
  if (isConfident(olds) && (!cands.length || cands[0].score < olds[0].score)) { matchOldReceivable(txId, olds[0].receivable.id, 'auto', `Auto: ${olds[0].reasons.join(', ')}`); return true; }
  return false;
}

// spárovanie so starou pohľadávkou (faktúra z minulých rokov)
function matchOldReceivable(txId, receivableId, how = 'manual', note = '') {
  const tx = get('SELECT * FROM bank_transactions WHERE id = ?', [txId]);
  if (!tx) throw new Error('Transakcia neexistuje');
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [receivableId]);
  if (!r) throw new Error('Pohľadávka neexistuje');
  return transaction(() => {
    unmatchTransaction(txId);
    const out = RC.addPayment({ receivableId, date: tx.date, amount: tx.amount, bankTransactionId: txId, note: `Banka: ${tx.counterparty_name || ''} ${tx.message || ''}`.trim() });
    run('UPDATE bank_transactions SET matched_invoice_id = NULL, matched_receivable_id = ?, match_status = ?, match_note = ? WHERE id = ?', [receivableId, how, note, txId]);
    log('match', `${how === 'auto' ? 'Automaticky' : 'Ručne'} spárovaná platba ${U.money(tx.amount)} z ${U.fmtDate(tx.date)} so starou pohľadávkou ${r.customer_name} VS ${r.variable_symbol || '–'}`);
    return out;
  });
}

function matchTransaction(txId, invoiceId, kind = 'payment', how = 'manual', note = '') {
  const tx = get('SELECT * FROM bank_transactions WHERE id = ?', [txId]);
  if (!tx) throw new Error('Transakcia neexistuje');
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv) throw new Error('Faktúra neexistuje');
  transaction(() => {
    run('DELETE FROM payments WHERE bank_transaction_id = ?', [txId]);
    INV.addPayment({ invoiceId, date: tx.date, amount: tx.amount, type: kind, bankTransactionId: txId, note: `Banka: ${tx.counterparty_name || ''} ${tx.message || ''}`.trim() });
    run('UPDATE bank_transactions SET matched_invoice_id = ?, match_status = ?, match_note = ? WHERE id = ?', [invoiceId, how, note, txId]);
    log('match', `${how === 'auto' ? 'Automaticky' : 'Ručne'} spárovaná platba ${U.money(tx.amount)} z ${U.fmtDate(tx.date)} s faktúrou ${inv.number}${kind === 'retention' ? ' (zádržné)' : ''}`);
  });
  return INV.refreshStatus(invoiceId);
}

function unmatchTransaction(txId) {
  const tx = get('SELECT * FROM bank_transactions WHERE id = ?', [txId]);
  if (!tx) return;
  transaction(() => {
    run('DELETE FROM payments WHERE bank_transaction_id = ?', [txId]);
    RC.removePaymentsByTransaction(txId);
    run("UPDATE bank_transactions SET matched_invoice_id = NULL, matched_receivable_id = NULL, match_status = 'unmatched', match_note = NULL WHERE id = ?", [txId]);
    if (tx.matched_invoice_id) INV.refreshStatus(tx.matched_invoice_id);
  });
}
function ignoreTransaction(txId, note = 'Ignorované') {
  unmatchTransaction(txId);
  run("UPDATE bank_transactions SET match_status = 'ignored', match_note = ? WHERE id = ?", [note, txId]);
}

// Opakovaný pokus o spárovanie všetkých nespárovaných kreditov
function rematchAll() {
  let n = 0;
  for (const t of all("SELECT id FROM bank_transactions WHERE match_status = 'unmatched' AND amount > 0")) if (autoMatch(t.id)) n++;
  return n;
}

module.exports = { importTransactions, importStatementFile, findCandidates, findOldReceivableCandidates, autoMatch, matchTransaction, matchOldReceivable, unmatchTransaction, ignoreTransaction, rematchAll };
