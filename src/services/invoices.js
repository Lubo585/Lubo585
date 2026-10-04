// Výpočty faktúr, číslovanie, stavy, skonto, zádržné, zrážková daň, fakturácia hodín s príplatkami
const { all, get, run, transaction, getSetting, getSettings, log } = require('../db');
const U = require('../utils');
const { t: T } = require('./i18n');

function nextInvoiceNumber(issueDate) {
  const year = (issueDate || U.today()).slice(0, 4);
  const fmt = getSetting('invoice_number_format') || '{YYYY}{NNNN}';
  const prefix = getSetting('invoice_prefix') || '';
  const rows = all('SELECT number FROM invoices WHERE issue_date LIKE ?', [year + '%']);
  let max = 0;
  const digits = (fmt.match(/\{N+\}/) || ['{NNNN}'])[0].length - 2;
  for (const r of rows) { const m = r.number.match(/(\d+)$/); if (m) { const n = parseInt(m[1].slice(-digits), 10); if (n > max) max = n; } }
  const seq = String(max + 1).padStart(digits, '0');
  return prefix + fmt.replace('{YYYY}', year).replace('{YY}', year.slice(2)).replace(/\{N+\}/, seq);
}
// Platí Freistellungsbescheinigung k dátumu?
function freistellungValid(date) { const s = getSettings(); return Boolean(s.freistellung_valid_until && s.freistellung_valid_until >= (date || U.today())); }

function recalc(invoiceId) {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv) return null;
  const items = all('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
  const fees = all('SELECT * FROM invoice_fees WHERE invoice_id = ?', [invoiceId]);
  const subtotal = U.round2(items.reduce((s, i) => s + U.round2(i.quantity * i.unit_price), 0));
  const vatRate = inv.vat_mode === 'standard' ? (inv.vat_rate || 0) : 0;
  const vat = U.round2(subtotal * vatRate / 100);
  const total = U.round2(subtotal + vat);
  const feesTotal = U.round2(fees.reduce((s, f) => s + Number(f.amount), 0));
  const retention = U.round2(total * (inv.retention_percent || 0) / 100);
  const withholding = U.round2(total * (inv.withholding_pct || 0) / 100);
  const amountDue = U.round2(total + feesTotal - retention - withholding);
  const skontoAmount = U.round2(amountDue * (inv.skonto_percent || 0) / 100);
  run(`UPDATE invoices SET subtotal=?, vat_amount=?, total=?, fees_total=?, retention_amount=?, withholding_amount=?, amount_due=?, skonto_amount=?, reverse_charge=? WHERE id=?`,
    [subtotal, vat, total, feesTotal, retention, withholding, amountDue, skontoAmount, inv.vat_mode === 'domestic_reverse' ? 1 : 0, invoiceId]);
  for (const i of items) run('UPDATE invoice_items SET total=? WHERE id=?', [U.round2(i.quantity * i.unit_price), i.id]);
  return refreshStatus(invoiceId);
}
function refreshStatus(invoiceId) {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv || inv.status === 'cancelled' || inv.status === 'draft') return inv;
  const pays = all("SELECT * FROM payments WHERE invoice_id = ? AND type = 'payment'", [invoiceId]);
  const ret = all("SELECT * FROM payments WHERE invoice_id = ? AND type = 'retention'", [invoiceId]);
  const paid = U.round2(pays.reduce((s, p) => s + p.amount, 0));
  const retPaid = U.round2(ret.reduce((s, p) => s + p.amount, 0));
  const tol = Number(getSetting('match_amount_tolerance')) || 0.02;
  let skontoApplied = 0, status = 'issued', paidDate = null;
  if (paid > 0) {
    const lastPay = pays.reduce((m, p) => (p.date > m ? p.date : m), '0000');
    if (inv.skonto_percent > 0 && inv.skonto_days > 0 && paid + tol < inv.amount_due) {
      const deadline = U.addDays(inv.issue_date, inv.skonto_days);
      if (lastPay <= deadline && paid + tol >= U.round2(inv.amount_due - inv.skonto_amount)) skontoApplied = 1;
    }
    const target = skontoApplied ? U.round2(inv.amount_due - inv.skonto_amount) : inv.amount_due;
    if (paid + tol >= target) { status = 'paid'; paidDate = lastPay; } else status = 'partial';
  }
  run('UPDATE invoices SET paid_amount=?, retention_paid=?, status=?, skonto_applied=?, paid_date=? WHERE id=?', [paid, retPaid, status, skontoApplied, paidDate, invoiceId]);
  return get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
}
function remaining(inv) { const target = inv.skonto_applied ? U.round2(inv.amount_due - inv.skonto_amount) : inv.amount_due; return U.round2(Math.max(0, target - inv.paid_amount)); }
function retentionRemaining(inv) { return U.round2(Math.max(0, inv.retention_amount - inv.retention_paid)); }
function isOverdue(inv) { return ['issued', 'partial'].includes(inv.status) && inv.due_date < U.today(); }
function daysOverdue(inv) { return isOverdue(inv) ? U.diffDays(U.today(), inv.due_date) : 0; }
function retentionOverdue(inv) { return inv.retention_amount > 0 && retentionRemaining(inv) > 0 && inv.retention_due_date && inv.retention_due_date < U.today(); }
// úrok z omeškania (jednoduchý, p. a.) a paušál podľa § 288 BGB
function lateInterest(inv) { const rate = Number(getSetting('default_interest_rate')) || 0; return U.round2(remaining(inv) * rate / 100 * daysOverdue(inv) / 365); }

function addPayment({ invoiceId, date, amount, type = 'payment', bankTransactionId = null, note = '' }) {
  run('INSERT INTO payments(invoice_id, date, amount, type, bank_transaction_id, note) VALUES (?,?,?,?,?,?)', [invoiceId, date, U.round2(amount), type, bankTransactionId, note]);
  return refreshStatus(invoiceId);
}

// Parametre faktúry podľa klienta (DPH režim, jazyk, zrážková daň, splatnosť…)
function clientDefaults(client, issueDate) {
  const s = getSettings();
  const vatMode = client.vat_mode || (client.reverse_charge ? 'domestic_reverse' : 'standard');
  return {
    vat_mode: vatMode, vat_rate: vatMode === 'standard' ? Number(s.default_vat_rate) : 0, language: client.language || s.default_language_documents || 'sk',
    due_date: U.addDays(issueDate, client.due_days || Number(s.default_due_days) || 14),
    retention_percent: client.retention_percent || 0, retention_due_date: client.retention_months ? U.addMonths(issueDate, client.retention_months) : null,
    skonto_percent: client.skonto_percent || 0, skonto_days: client.skonto_days || 0,
    withholding_pct: client.bauabzugsteuer && !freistellungValid(issueDate) ? 15 : 0,
  };
}

// Vytvorenie faktúry z hodinových lístkov pre klienta a obdobie (s príplatkami podľa cenníka)
function createFromTimesheets({ clientId, siteId, from, to, issueDate, vatRate, note, language }) {
  const client = get('SELECT * FROM clients WHERE id = ?', [clientId]);
  if (!client) throw new Error('Klient neexistuje');
  const params = [clientId, from, to]; let siteFilter = '';
  if (siteId) { siteFilter = ' AND s.id = ?'; params.push(siteId); }
  const rows = all(`SELECT r.*, t.week_start, t.site_id, s.name AS site_name, s.hourly_rate AS site_rate, s.overtime_rate AS site_ot_rate, s.hours_per_day,
      w.first_name, w.last_name, w.position, w.hourly_rate AS worker_rate
    FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id JOIN workers w ON w.id = r.worker_id
    WHERE s.client_id = ? AND t.status = 'approved' AND r.invoice_id IS NULL AND t.week_start >= ? AND t.week_start <= ? ${siteFilter}
    ORDER BY s.name, t.week_start, w.last_name, w.first_name`, params);
  if (!rows.length) throw new Error('Pre zvolené obdobie nie sú žiadne schválené a nevyfakturované hodinové lístky.');
  issueDate = issueDate || U.today();
  const d = clientDefaults(client, issueDate);
  if (vatRate !== undefined && vatRate !== null && d.vat_mode === 'standard') d.vat_rate = vatRate;
  const lang = language || d.language; const L = T(lang);
  const number = nextInvoiceNumber(issueDate);
  const rates = all('SELECT * FROM client_rates WHERE client_id = ? AND (valid_from IS NULL OR valid_from <= ?) ORDER BY valid_from DESC', [clientId, to]);
  const std = Number(getSetting('standard_hours_per_day')) || 8;
  const norm = (x) => String(x || '').toLowerCase().trim();
  return transaction(() => {
    const res = run(`INSERT INTO invoices(number, variable_symbol, client_id, site_id, issue_date, delivery_date, due_date, period_from, period_to, vat_rate, vat_mode, language, reverse_charge, retention_percent, retention_due_date, skonto_percent, skonto_days, withholding_pct, status, note)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'issued',?)`,
      [number, number.replace(/\D/g, ''), clientId, siteId || null, issueDate, to, d.due_date, from, to, d.vat_rate, d.vat_mode, lang, d.vat_mode === 'domestic_reverse' ? 1 : 0, d.retention_percent, d.retention_due_date, d.skonto_percent, d.skonto_days, d.withholding_pct, note || '']);
    const invoiceId = Number(res.lastInsertRowid);
    const groups = new Map();
    const addLine = (key, desc, hours, rate, order) => { if (!groups.has(key)) groups.set(key, { desc, hours: 0, rate, weeks: new Set(), order }); const g = groups.get(key); g.hours = U.round2(g.hours + hours); };
    for (const r of rows) {
      const prof = r.profession || r.position || '';
      const rateRow = rates.find((x) => norm(x.profession) === norm(prof)) || rates.find((x) => norm(x.profession) === norm(r.position));
      const base = r.rate_override ?? r.worker_rate ?? (rateRow ? rateRow.rate : null) ?? r.site_rate ?? 0;
      const stdDay = Number(r.hours_per_day) || std;
      const wk = U.isoWeek(r.week_start); const wkLabel = `${L.week}${wk.week}`;
      const who = `${r.last_name} ${r.first_name} (${prof || '–'}) – ${r.site_name}`;
      let regular = 0, overtime = 0;
      for (let i = 1; i <= 5; i++) { const h = r['d' + i] || 0; overtime += Math.max(0, h - stdDay); regular += Math.min(h, stdDay); }
      const sat = r.d6 || 0, sun = r.d7 || 0, night = r.night_hours || 0;
      const pct = rateRow ? { ot: rateRow.overtime_pct, sa: rateRow.saturday_pct, su: rateRow.sunday_pct, ni: rateRow.night_pct } : null;
      const k = `${r.worker_id}|${r.site_id}|${base}`;
      if (pct) {
        if (regular) addLine(k + '|reg', who, regular, base, 0);
        if (overtime) addLine(k + '|ot', `${who} – ${L.overtime} +${pct.ot} %`, overtime, U.round2(base * (1 + pct.ot / 100)), 1);
        if (sat) addLine(k + '|sa', `${who} – ${L.saturday} +${pct.sa} %`, sat, U.round2(base * (1 + pct.sa / 100)), 2);
        if (sun) addLine(k + '|su', `${who} – ${L.sunday} +${pct.su} %`, sun, U.round2(base * (1 + pct.su / 100)), 3);
        if (night) addLine(k + '|ni', `${who} – ${L.night} ${L.surcharge} ${pct.ni} %`, night, U.round2(base * pct.ni / 100), 4);
      } else if (r.site_ot_rate && overtime) {
        addLine(k + '|reg', who, regular + sat + sun, base, 0);
        addLine(k + '|ot', `${who} – ${L.overtime}`, overtime, r.site_ot_rate, 1);
      } else {
        const h = U.round2(regular + overtime + sat + sun); if (h) addLine(k + '|reg', who, h, base, 0);
      }
      for (const key of groups.keys()) if (key.startsWith(k + '|')) groups.get(key).weeks.add(wkLabel);
      run('UPDATE timesheet_rows SET invoice_id = ? WHERE id = ?', [invoiceId, r.id]);
    }
    let order = 0;
    for (const g of [...groups.values()].sort((a, b) => a.desc.localeCompare(b.desc) || a.order - b.order)) {
      if (g.hours <= 0) continue;
      run('INSERT INTO invoice_items(invoice_id, description, quantity, unit, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?)', [invoiceId, `${g.desc} (${[...g.weeks].join(', ')})`, g.hours, L.hours, g.rate, U.round2(g.hours * g.rate), order++]);
    }
    run(`UPDATE timesheets SET status = 'invoiced' WHERE status = 'approved' AND id IN (SELECT t.id FROM timesheets t WHERE NOT EXISTS (SELECT 1 FROM timesheet_rows r WHERE r.timesheet_id = t.id AND r.invoice_id IS NULL))`);
    recalc(invoiceId);
    log('invoice', `Vystavená faktúra ${number} z hodinových lístkov pre ${client.name}`);
    return invoiceId;
  });
}
function invoiceStatusLabel(inv) {
  if (inv.status === 'cancelled') return { text: 'Stornovaná', cls: 'muted' };
  if (inv.status === 'draft') return { text: 'Koncept', cls: 'muted' };
  if (inv.status === 'paid') return { text: inv.skonto_applied ? 'Uhradená (skonto)' : 'Uhradená', cls: 'ok' };
  if (isOverdue(inv)) return { text: `Po splatnosti ${daysOverdue(inv)} d`, cls: 'danger' };
  if (inv.status === 'partial') return { text: 'Čiastočne uhradená', cls: 'warn' };
  return { text: 'Vystavená', cls: 'info' };
}
// Súhrnný výkaz DPH (EC Sales List): služby s prenesením DPH do iných členských štátov za štvrťrok
function ecSalesList(year, quarter) {
  const from = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
  const to = U.monthEnd(`${year}-${String(quarter * 3).padStart(2, '0')}-01`);
  const rows = all(`SELECT c.name, c.country, c.ic_dph, SUM(i.subtotal) AS amount, COUNT(*) AS cnt FROM invoices i JOIN clients c ON c.id = i.client_id
    WHERE i.vat_mode = 'eu_reverse' AND i.status != 'cancelled' AND i.issue_date >= ? AND i.issue_date <= ? GROUP BY c.id ORDER BY c.country, c.name`, [from, to]);
  return { from, to, rows: rows.map((r) => ({ ...r, amount: U.round2(r.amount), code: 2 })) };
}
module.exports = { nextInvoiceNumber, recalc, refreshStatus, remaining, retentionRemaining, isOverdue, daysOverdue, retentionOverdue, lateInterest, addPayment, createFromTimesheets, invoiceStatusLabel, clientDefaults, freistellungValid, ecSalesList };
