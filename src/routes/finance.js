// Financie: cash-flow výhľad, exporty pre účtovníctvo, rozšírená ziskovosť
const router = require('express').Router();
const { all, get } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');
const R = require('../services/reports');
const { monthCost } = require('./lodging');

router.get('/', (req, res) => {
  const today = U.today();
  // cash-flow: 8 týždňov dopredu
  const weeks = []; let ws = U.weekStart(today);
  const open = all("SELECT * FROM invoices WHERE status IN ('issued','partial')");
  const retention = all("SELECT * FROM invoices WHERE status != 'cancelled' AND retention_amount > retention_paid + 0.005");
  const settl = all("SELECT * FROM settlements WHERE status != 'paid'");
  const recurring = all('SELECT * FROM expenses WHERE recurring = 1 AND date >= ?', [U.addMonths(today, -2)]);
  const overdueIn = open.filter((i) => i.due_date < ws).reduce((a, i) => a + INV.remaining(i), 0);
  for (let k = 0; k < 8; k++) {
    const we = U.addDays(ws, 6);
    const incoming = open.filter((i) => i.due_date >= ws && i.due_date <= we).reduce((a, i) => a + INV.remaining(i), 0) + retention.filter((i) => i.retention_due_date && i.retention_due_date >= ws && i.retention_due_date <= we).reduce((a, i) => a + INV.retentionRemaining(i), 0);
    const wages = settl.filter((s) => { const d = U.addDays(U.monthEnd(s.month + '-01'), 10); return d >= ws && d <= we; }).reduce((a, s) => a + s.total_due, 0);
    const exp = recurring.filter((e) => { const d = ws.slice(0, 7) + '-' + e.date.slice(8); return d >= ws && d <= we; }).reduce((a, e) => a + e.amount_total, 0);
    weeks.push({ from: ws, to: we, incoming: U.round2(incoming), outgoing: U.round2(wages + exp), wages: U.round2(wages), expenses: U.round2(exp) });
    ws = U.addDays(ws, 7);
  }
  let cum = 0; for (const w of weeks) { cum += w.incoming - w.outgoing; w.cum = U.round2(cum); }
  // ziskovosť za obdobie vrátane ubytovania, dopravy, diét
  const from = req.query.from || (today.slice(0, 4) + '-01-01'), to = req.query.to || today;
  const rev = R.revenue(from, to), exp = R.expenses(from, to), lab = R.laborCost(from, to);
  const lodging = (() => { let t = 0; for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = U.addMonths(m + '-01', 1).slice(0, 7)) t += monthCost(m).total; return U.round2(t); })();
  const trips = get('SELECT COALESCE(SUM(cost),0) AS c, COALESCE(SUM(km),0) AS km FROM trips WHERE date >= ? AND date <= ?', [from, to]);
  const perDiem = get('SELECT COALESCE(SUM(per_diem_total),0) AS s FROM settlements WHERE month >= ? AND month <= ?', [from.slice(0, 7), to.slice(0, 7)]).s;
  const wagesPaid = get('SELECT COALESCE(SUM(wage_total + bonus_total),0) AS s FROM settlements WHERE month >= ? AND month <= ?', [from.slice(0, 7), to.slice(0, 7)]).s;
  const byWorker = R.byWorker(from, to).map((w) => { const s = get('SELECT COALESCE(SUM(total_due),0) AS paid, COALESCE(SUM(per_diem_total),0) AS pd FROM settlements WHERE worker_id = ? AND month >= ? AND month <= ?', [w.id, from.slice(0, 7), to.slice(0, 7)]); const lodge = get('SELECT COALESCE(SUM(price_per_night),0) AS p FROM lodging_stays WHERE worker_id = ? AND charge_to = ? AND date_from <= ?', [w.id, 'company', to]); return { ...w, settled: U.round2(s.paid), perdiem: U.round2(s.pd), margin2: U.round2(w.billable - w.labor - w.expenses - s.pd) }; });
  res.render('finance/index', { title: 'Financie', weeks, overdueIn: U.round2(overdueIn), from, to, rev, exp, lab, lodging, trips, perDiem: U.round2(perDiem), wagesPaid: U.round2(wagesPaid), byWorker, receivables: U.round2(open.reduce((a, i) => a + INV.remaining(i), 0)), retentionSum: U.round2(retention.reduce((a, i) => a + INV.retentionRemaining(i), 0)) });
});
// exporty CSV pre účtovníctvo
router.get('/export', (req, res) => res.render('finance/export', { title: 'Export pre účtovníctvo', from: req.query.from || (U.today().slice(0, 4) + '-01-01'), to: req.query.to || U.today() }));
router.get('/export/:what.csv', (req, res) => {
  const from = req.query.from || '2000-01-01', to = req.query.to || '2999-12-31';
  const csv = (header, rows) => { res.setHeader('Content-Disposition', `attachment; filename="${req.params.what}-${from}-${to}.csv"`); res.type('text/csv'); res.send('﻿' + [header.join(';')].concat(rows.map((r) => r.map((v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v ?? '').replace(/;/g, ','))).join(';'))).join('\r\n')); };
  if (req.params.what === 'invoices') return csv(['Číslo', 'VS', 'Klient', 'IČ DPH', 'Krajina', 'Vystavená', 'Dodanie', 'Splatnosť', 'Režim DPH', 'Základ', 'DPH %', 'DPH', 'Spolu', 'Poplatky', 'Zádržné', 'Bauabzugsteuer', 'K úhrade', 'Uhradené', 'Stav', 'Zákazka'], all('SELECT i.*, c.name AS cn, c.ic_dph, c.country, s.name AS sn FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN sites s ON s.id=i.site_id WHERE i.issue_date >= ? AND i.issue_date <= ? ORDER BY i.number', [from, to]).map((i) => [i.number, i.variable_symbol, i.cn, i.ic_dph, i.country, i.issue_date, i.delivery_date, i.due_date, i.vat_mode, i.subtotal, i.vat_rate, i.vat_amount, i.total, i.fees_total, i.retention_amount, i.withholding_amount, i.amount_due, i.paid_amount, i.status, i.sn]));
  if (req.params.what === 'payments') return csv(['Dátum', 'Faktúra', 'Klient', 'Typ', 'Suma', 'Zdroj', 'Poznámka'], all('SELECT p.*, i.number, c.name AS cn FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN clients c ON c.id=i.client_id WHERE p.date >= ? AND p.date <= ? ORDER BY p.date', [from, to]).map((p) => [p.date, p.number, p.cn, p.type, p.amount, p.bank_transaction_id ? 'banka' : 'ručne', p.note]));
  if (req.params.what === 'expenses') return csv(['Dátum', 'Kategória', 'Popis', 'Dodávateľ', 'Základ', 'DPH %', 'Spolu', 'Pracovník', 'Zákazka', 'Uhradené'], all('SELECT e.*, w.last_name, w.first_name, s.name AS sn FROM expenses e LEFT JOIN workers w ON w.id=e.worker_id LEFT JOIN sites s ON s.id=e.site_id WHERE e.date >= ? AND e.date <= ? ORDER BY e.date', [from, to]).map((e) => [e.date, e.category, e.description, e.supplier, e.amount_net, e.vat_rate, e.amount_total, e.last_name ? e.last_name + ' ' + e.first_name : '', e.sn, e.paid ? 'áno' : 'nie']));
  if (req.params.what === 'settlements') return csv(['Mesiac', 'Pracovník', 'Hodiny', 'Mzda/h', 'Mzda', 'Diéty dní', 'Diéty', 'Bonusy', 'Zálohy', 'Zrážky', 'K výplate', 'Stav', 'Vyplatené', 'IBAN'], all('SELECT s.*, w.last_name, w.first_name, w.iban FROM settlements s JOIN workers w ON w.id=s.worker_id WHERE s.month >= ? AND s.month <= ? ORDER BY s.month, w.last_name', [from.slice(0, 7), to.slice(0, 7)]).map((s) => [s.month, s.last_name + ' ' + s.first_name, s.hours, s.wage_rate, s.wage_total, s.per_diem_days, s.per_diem_total, s.bonus_total, s.advances_total, s.deductions_total, s.total_due, s.status, s.paid_at, s.iban]));
  if (req.params.what === 'hours') return csv(['Týždeň od', 'Pracovník', 'Profesia', 'Klient', 'Zákazka', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne', 'Spolu', 'Noc', 'Stav', 'Faktúra'], all('SELECT r.*, t.week_start, t.status, w.last_name, w.first_name, w.position, s.name AS sn, c.name AS cn, i.number FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN workers w ON w.id=r.worker_id JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id LEFT JOIN invoices i ON i.id=r.invoice_id WHERE t.week_start >= ? AND t.week_start <= ? ORDER BY t.week_start, w.last_name', [from, to]).map((r) => [r.week_start, r.last_name + ' ' + r.first_name, r.profession || r.position, r.cn, r.sn, r.d1, r.d2, r.d3, r.d4, r.d5, r.d6, r.d7, r.d1 + r.d2 + r.d3 + r.d4 + r.d5 + r.d6 + r.d7, r.night_hours, r.status, r.number]));
  res.status(404).send('Neznámy export');
});
module.exports = router;
