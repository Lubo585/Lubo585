// Staré pohľadávky: otvorené faktúry a doplatky z minulých rokov (mimo bežnej fakturácie v aplikácii)
const { all, get, run, transaction, log } = require('../db');
const U = require('../utils');

// stav → [popis, farba odznaku, uzavretá?]
const STATUSES = {
  open: ['Otvorená', 'danger', false],
  partial: ['Čiastočne uhradená', 'warn', false],
  promised: ['Prisľúbená úhrada', 'info', false],
  disputed: ['Sporná / reklamovaná', 'warn', false],
  legal: ['Vymáhanie / právnik', 'danger', false],
  paid: ['Uhradená', 'ok', true],
  written_off: ['Odpísaná', 'muted', true],
};
const OPEN_STATUSES = Object.keys(STATUSES).filter((k) => !STATUSES[k][2]);

const remaining = (r) => Math.max(0, U.round2((r.amount || 0) - (r.paid_amount || 0)));
const isOpen = (r) => !STATUSES[r.status] || !STATUSES[r.status][2];

// prepočíta uhradenú sumu z úhrad a nastaví stav (ručné stavy prisľúbená/sporná/vymáhanie/odpísaná ostávajú)
function refresh(id) {
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [id]);
  if (!r) return null;
  const paid = U.round2(get('SELECT COALESCE(SUM(amount),0) AS s FROM old_receivable_payments WHERE receivable_id = ?', [id]).s);
  let status = r.status;
  if (paid >= r.amount - 0.005 && r.amount > 0) status = 'paid';
  else if (status === 'paid') status = paid > 0 ? 'partial' : 'open';
  else if (status === 'open' && paid > 0) status = 'partial';
  else if (status === 'partial' && paid <= 0) status = 'open';
  run("UPDATE old_receivables SET paid_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?", [paid, status, id]);
  return get('SELECT * FROM old_receivables WHERE id = ?', [id]);
}

function addPayment({ receivableId, date, amount, note = '', bankTransactionId = null, userId = null }) {
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [receivableId]);
  if (!r) throw new Error('Pohľadávka neexistuje');
  const amt = U.round2(U.num(amount));
  if (!(amt > 0)) throw new Error('Suma úhrady musí byť väčšia ako 0');
  return transaction(() => {
    run('INSERT INTO old_receivable_payments(receivable_id, date, amount, note, bank_transaction_id) VALUES (?,?,?,?,?)', [receivableId, date || U.today(), amt, note, bankTransactionId]);
    run("INSERT INTO old_receivable_notes(receivable_id, user_id, type, text) VALUES (?,?,'payment',?)", [receivableId, userId, `Úhrada ${U.money(amt)} (${U.fmtDate(date || U.today())})${note ? ' – ' + note : ''}`]);
    const out = refresh(receivableId);
    log('receivable', `Stará pohľadávka ${r.customer_name} VS ${r.variable_symbol || '–'}: úhrada ${U.money(amt)}${out.status === 'paid' ? ' – uhradená celá' : ''}`);
    return out;
  });
}

function removePaymentsByTransaction(txId) {
  const rows = all('SELECT DISTINCT receivable_id FROM old_receivable_payments WHERE bank_transaction_id = ?', [txId]);
  run('DELETE FROM old_receivable_payments WHERE bank_transaction_id = ?', [txId]);
  for (const r of rows) refresh(r.receivable_id);
}

function setStatus(id, status, text = '', userId = null) {
  if (!STATUSES[status]) throw new Error('Neznámy stav');
  const r = get('SELECT * FROM old_receivables WHERE id = ?', [id]);
  if (!r) throw new Error('Pohľadávka neexistuje');
  run("UPDATE old_receivables SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  run("INSERT INTO old_receivable_notes(receivable_id, user_id, type, text) VALUES (?,?,'status',?)", [id, userId, 'Stav zmenený na: ' + STATUSES[status][0] + (text ? ' – ' + text : '')]);
  if (status === 'paid' && remaining(r) > 0) {
    // označené ako uhradené bez evidencie úhrady – doplň vyrovnávaciu úhradu, aby zostatok sedel
    run('INSERT INTO old_receivable_payments(receivable_id, date, amount, note) VALUES (?,?,?,?)', [id, U.today(), remaining(r), 'Označené ako uhradené' + (text ? ': ' + text : '')]);
  }
  return refresh(id);
}

// otvorené pohľadávky s rovnakým VS (na párovanie bankových platieb)
function openByVs(vs) {
  const v = String(vs || '').replace(/^0+/, '');
  if (!v) return [];
  return all(`SELECT * FROM old_receivables WHERE status IN (${OPEN_STATUSES.map(() => '?').join(',')}) AND ltrim(COALESCE(variable_symbol, ''), '0') = ?`, [...OPEN_STATUSES, v]);
}

function summary() {
  const open = all(`SELECT * FROM old_receivables WHERE status IN (${OPEN_STATUSES.map(() => '?').join(',')})`, OPEN_STATUSES);
  return {
    openSum: U.round2(open.reduce((s, r) => s + remaining(r), 0)),
    openCount: open.length,
    customers: new Set(open.map((r) => r.customer_name)).size,
    disputedSum: U.round2(open.filter((r) => r.status === 'disputed' || r.status === 'legal').reduce((s, r) => s + remaining(r), 0)),
    promisedSum: U.round2(open.filter((r) => r.status === 'promised').reduce((s, r) => s + remaining(r), 0)),
  };
}

module.exports = { STATUSES, OPEN_STATUSES, remaining, isOpen, refresh, addPayment, removePaymentsByTransaction, setStatus, openByVs, summary };
