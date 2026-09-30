// Výpočty faktúr, číslovanie, stavy, skonto a zádržné
const { all, get, run, transaction, getSetting, log } = require('../db');
const U = require('../utils');

function nextInvoiceNumber(issueDate) {
  const year = (issueDate || U.today()).slice(0, 4);
  const fmt = getSetting('invoice_number_format') || '{YYYY}{NNNN}';
  const prefix = getSetting('invoice_prefix') || '';
  // nájdi najvyššie poradové číslo v danom roku
  const rows = all('SELECT number FROM invoices WHERE issue_date LIKE ?', [year + '%']);
  let max = 0;
  const digits = (fmt.match(/\{N+\}/) || ['{NNNN}'])[0].length - 2;
  for (const r of rows) {
    const m = r.number.match(/(\d+)$/);
    if (m) {
      const n = parseInt(m[1].slice(-digits), 10);
      if (n > max) max = n;
    }
  }
  const seq = String(max + 1).padStart(digits, '0');
  const number = prefix + fmt.replace('{YYYY}', year).replace('{YY}', year.slice(2)).replace(/\{N+\}/, seq);
  return number;
}

// Prepočet súm faktúry z položiek a poplatkov
function recalc(invoiceId) {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv) return null;
  const items = all('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
  const fees = all('SELECT * FROM invoice_fees WHERE invoice_id = ?', [invoiceId]);
  const subtotal = U.round2(items.reduce((s, i) => s + U.round2(i.quantity * i.unit_price), 0));
  const vatRate = inv.reverse_charge ? 0 : (inv.vat_rate || 0);
  const vat = U.round2(subtotal * vatRate / 100);
  const total = U.round2(subtotal + vat);
  const feesTotal = U.round2(fees.reduce((s, f) => s + Number(f.amount), 0));
  const retention = U.round2(total * (inv.retention_percent || 0) / 100);
  const amountDue = U.round2(total + feesTotal - retention);
  const skontoAmount = U.round2(amountDue * (inv.skonto_percent || 0) / 100);
  run(`UPDATE invoices SET subtotal=?, vat_amount=?, total=?, fees_total=?, retention_amount=?, amount_due=?, skonto_amount=? WHERE id=?`,
    [subtotal, vat, total, feesTotal, retention, amountDue, skontoAmount, invoiceId]);
  for (const i of items) run('UPDATE invoice_items SET total=? WHERE id=?', [U.round2(i.quantity * i.unit_price), i.id]);
  return refreshStatus(invoiceId);
}

// Aktualizácia stavu podľa platieb (vrátane automatického uznania skonta)
function refreshStatus(invoiceId) {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv || inv.status === 'cancelled' || inv.status === 'draft') return inv;
  const pays = all("SELECT * FROM payments WHERE invoice_id = ? AND type = 'payment'", [invoiceId]);
  const ret = all("SELECT * FROM payments WHERE invoice_id = ? AND type = 'retention'", [invoiceId]);
  const paid = U.round2(pays.reduce((s, p) => s + p.amount, 0));
  const retPaid = U.round2(ret.reduce((s, p) => s + p.amount, 0));
  const tol = Number(getSetting('match_amount_tolerance')) || 0.02;

  let skontoApplied = 0;
  let status = 'issued';
  let paidDate = null;
  if (paid > 0) {
    const lastPay = pays.reduce((m, p) => (p.date > m ? p.date : m), '0000');
    // skonto: úhrada v lehote a suma >= splatná suma - skonto
    if (inv.skonto_percent > 0 && inv.skonto_days > 0 && paid + tol < inv.amount_due) {
      const deadline = U.addDays(inv.issue_date, inv.skonto_days);
      if (lastPay <= deadline && paid + tol >= U.round2(inv.amount_due - inv.skonto_amount)) skontoApplied = 1;
    }
    const target = skontoApplied ? U.round2(inv.amount_due - inv.skonto_amount) : inv.amount_due;
    if (paid + tol >= target) { status = 'paid'; paidDate = lastPay; }
    else status = 'partial';
  }
  run('UPDATE invoices SET paid_amount=?, retention_paid=?, status=?, skonto_applied=?, paid_date=? WHERE id=?',
    [paid, retPaid, status, skontoApplied, paidDate, invoiceId]);
  return get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
}

// Zostávajúca suma k úhrade (bez zádržného)
function remaining(inv) {
  const target = inv.skonto_applied ? U.round2(inv.amount_due - inv.skonto_amount) : inv.amount_due;
  return U.round2(Math.max(0, target - inv.paid_amount));
}
function retentionRemaining(inv) { return U.round2(Math.max(0, inv.retention_amount - inv.retention_paid)); }
function isOverdue(inv) {
  return ['issued', 'partial'].includes(inv.status) && inv.due_date < U.today();
}
function daysOverdue(inv) { return isOverdue(inv) ? U.diffDays(U.today(), inv.due_date) : 0; }
function retentionOverdue(inv) {
  return inv.retention_amount > 0 && retentionRemaining(inv) > 0 && inv.retention_due_date && inv.retention_due_date < U.today();
}

function addPayment({ invoiceId, date, amount, type = 'payment', bankTransactionId = null, note = '' }) {
  run('INSERT INTO payments(invoice_id, date, amount, type, bank_transaction_id, note) VALUES (?,?,?,?,?,?)',
    [invoiceId, date, U.round2(amount), type, bankTransactionId, note]);
  return refreshStatus(invoiceId);
}

// Vytvorenie faktúry z hodinových lístkov pre klienta a obdobie
function createFromTimesheets({ clientId, siteId, from, to, issueDate, vatRate, note }) {
  const client = get('SELECT * FROM clients WHERE id = ?', [clientId]);
  if (!client) throw new Error('Klient neexistuje');
  const params = [clientId, from, to];
  let siteFilter = '';
  if (siteId) { siteFilter = ' AND s.id = ?'; params.push(siteId); }
  const rows = all(`
    SELECT r.*, t.week_start, t.site_id, s.name AS site_name, s.hourly_rate AS site_rate,
           w.first_name, w.last_name, w.hourly_rate AS worker_rate
    FROM timesheet_rows r
    JOIN timesheets t ON t.id = r.timesheet_id
    JOIN sites s ON s.id = t.site_id
    JOIN workers w ON w.id = r.worker_id
    WHERE s.client_id = ? AND t.status = 'approved' AND r.invoice_id IS NULL
      AND t.week_start >= ? AND t.week_start <= ? ${siteFilter}
    ORDER BY s.name, t.week_start, w.last_name, w.first_name`, params);
  if (!rows.length) throw new Error('Pre zvolené obdobie nie sú žiadne schválené a nevyfakturované hodinové lístky.');

  issueDate = issueDate || U.today();
  const dueDays = client.due_days || Number(getSetting('default_due_days')) || 14;
  const number = nextInvoiceNumber(issueDate);
  const reverse = client.reverse_charge ? 1 : 0;

  return transaction(() => {
    const res = run(`INSERT INTO invoices(number, variable_symbol, client_id, site_id, issue_date, delivery_date, due_date, period_from, period_to,
      vat_rate, reverse_charge, retention_percent, retention_due_date, skonto_percent, skonto_days, status, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'issued',?)`,
      [number, number.replace(/\D/g, ''), clientId, siteId || null, issueDate, to, U.addDays(issueDate, dueDays), from, to,
        reverse ? 0 : (vatRate ?? Number(getSetting('default_vat_rate'))), reverse,
        client.retention_percent || 0, client.retention_months ? U.addMonths(issueDate, client.retention_months) : null,
        client.skonto_percent || 0, client.skonto_days || 0, note || '']);
    const invoiceId = Number(res.lastInsertRowid);
    let order = 0;
    // zoskupenie: pracovník + stavba + sadzba
    const groups = new Map();
    for (const r of rows) {
      const h = U.round2(r.d1 + r.d2 + r.d3 + r.d4 + r.d5 + r.d6 + r.d7);
      if (h <= 0) { run('UPDATE timesheet_rows SET invoice_id = ? WHERE id = ?', [invoiceId, r.id]); continue; }
      const rate = r.rate_override ?? r.worker_rate ?? r.site_rate ?? 0;
      const key = `${r.worker_id}|${r.site_id}|${rate}`;
      if (!groups.has(key)) groups.set(key, { desc: `${r.last_name} ${r.first_name} – ${r.site_name}`, hours: 0, rate, weeks: [] });
      const g = groups.get(key);
      g.hours = U.round2(g.hours + h);
      const wk = U.isoWeek(r.week_start);
      g.weeks.push(`T${wk.week}`);
      run('UPDATE timesheet_rows SET invoice_id = ? WHERE id = ?', [invoiceId, r.id]);
    }
    for (const g of groups.values()) {
      run('INSERT INTO invoice_items(invoice_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?)',
        [invoiceId, `${g.desc} (${g.weeks.join(', ')})`, g.hours, 'hod', g.rate, U.round2(g.hours * g.rate), order++]);
    }
    // lístky, ktoré už nemajú nevyfakturované riadky -> stav invoiced
    run(`UPDATE timesheets SET status = 'invoiced' WHERE status = 'approved' AND id IN (
      SELECT t.id FROM timesheets t WHERE NOT EXISTS (SELECT 1 FROM timesheet_rows r WHERE r.timesheet_id = t.id AND r.invoice_id IS NULL))`);
    recalc(invoiceId);
    log('invoice', `Vystavená faktúra ${number} z hodinových lístkov pre ${client.name}`);
    return invoiceId;
  });
}

// Prehľady
function invoiceStatusLabel(inv) {
  if (inv.status === 'cancelled') return { text: 'Stornovaná', cls: 'muted' };
  if (inv.status === 'draft') return { text: 'Koncept', cls: 'muted' };
  if (inv.status === 'paid') return { text: inv.skonto_applied ? 'Uhradená (skonto)' : 'Uhradená', cls: 'ok' };
  if (isOverdue(inv)) return { text: `Po splatnosti ${daysOverdue(inv)} d`, cls: 'danger' };
  if (inv.status === 'partial') return { text: 'Čiastočne uhradená', cls: 'warn' };
  return { text: 'Vystavená', cls: 'info' };
}

module.exports = { nextInvoiceNumber, recalc, refreshStatus, remaining, retentionRemaining, isOverdue, daysOverdue, retentionOverdue, addPayment, createFromTimesheets, invoiceStatusLabel };
