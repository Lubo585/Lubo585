// Prehľady: zisky, náklady, hodiny
const { all, get } = require('../db');
const U = require('../utils');

// Nákladová cena odpracovaných hodín za obdobie (podľa týždňov, ktoré začínajú v období)
function laborCost(from, to) {
  const r = get(`SELECT COALESCE(SUM((r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) * w.hourly_cost),0) AS cost,
    COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) AS hours
    FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN workers w ON w.id = r.worker_id
    WHERE t.week_start >= ? AND t.week_start <= ?`, [from, to]);
  return { cost: U.round2(r.cost), hours: U.round2(r.hours) };
}
function revenue(from, to) {
  const r = get(`SELECT COALESCE(SUM(subtotal),0) AS net, COALESCE(SUM(amount_due),0) AS due, COUNT(*) AS cnt FROM invoices
    WHERE status != 'cancelled' AND status != 'draft' AND issue_date >= ? AND issue_date <= ?`, [from, to]);
  return { net: U.round2(r.net), due: U.round2(r.due), count: r.cnt };
}
function expenses(from, to) {
  const r = get('SELECT COALESCE(SUM(amount_net),0) AS net, COALESCE(SUM(amount_total),0) AS total FROM expenses WHERE date >= ? AND date <= ?', [from, to]);
  const byCat = all('SELECT category, SUM(amount_net) AS net, SUM(amount_total) AS total, COUNT(*) AS cnt FROM expenses WHERE date >= ? AND date <= ? GROUP BY category ORDER BY net DESC', [from, to]);
  const wages = byCat.find((c) => c.category === 'Mzdy a odvody');
  return { net: U.round2(r.net), total: U.round2(r.total), byCategory: byCat, wagesNet: U.round2(wages ? wages.net : 0) };
}
// Mesačný prehľad ziskovosti za posledných N mesiacov
function monthly(months = 12) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = U.toISO(d);
    const to = U.monthEnd(from);
    const rev = revenue(from, to), exp = expenses(from, to), lab = laborCost(from, to);
    // ak sú mzdy zadané v nákladoch, neduplikuj ich s výpočtom z hodín
    const laborEffective = exp.wagesNet > 0 ? 0 : lab.cost;
    out.push({ month: from.slice(0, 7), label: `${U.MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, revenue: rev.net, invoices: rev.count, expenses: exp.net, labor: lab.cost, laborEffective, hours: lab.hours, profit: U.round2(rev.net - exp.net - laborEffective) });
  }
  return out;
}
// Ziskovosť podľa stavieb
function bySite(from, to) {
  return all(`SELECT s.id, s.name, c.name AS client_name,
      COALESCE((SELECT SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.site_id=s.id AND t.week_start>=? AND t.week_start<=?),0) AS hours,
      COALESCE((SELECT SUM((r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7)*w.hourly_cost) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN workers w ON w.id=r.worker_id WHERE t.site_id=s.id AND t.week_start>=? AND t.week_start<=?),0) AS labor,
      COALESCE((SELECT SUM((r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7)*COALESCE(r.rate_override, w.hourly_rate, s.hourly_rate)) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN workers w ON w.id=r.worker_id WHERE t.site_id=s.id AND t.week_start>=? AND t.week_start<=?),0) AS billable,
      COALESCE((SELECT SUM(e.amount_net) FROM expenses e WHERE e.site_id=s.id AND e.date>=? AND e.date<=?),0) AS expenses
    FROM sites s JOIN clients c ON c.id = s.client_id ORDER BY billable DESC`, [from, to, from, to, from, to, from, to])
    .map((r) => ({ ...r, margin: U.round2(r.billable - r.labor - r.expenses) }));
}
function byWorker(from, to) {
  return all(`SELECT w.id, w.first_name, w.last_name, w.position, w.hourly_cost,
      COALESCE((SELECT SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE r.worker_id=w.id AND t.week_start>=? AND t.week_start<=?),0) AS hours,
      COALESCE((SELECT SUM((r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7)*COALESCE(r.rate_override, w.hourly_rate, s.hourly_rate)) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN sites s ON s.id=t.site_id WHERE r.worker_id=w.id AND t.week_start>=? AND t.week_start<=?),0) AS billable,
      COALESCE((SELECT SUM(e.amount_net) FROM expenses e WHERE e.worker_id=w.id AND e.date>=? AND e.date<=?),0) AS expenses
    FROM workers w WHERE w.active = 1 ORDER BY hours DESC`, [from, to, from, to, from, to])
    .map((r) => ({ ...r, labor: U.round2(r.hours * r.hourly_cost), margin: U.round2(r.billable - r.hours * r.hourly_cost - r.expenses) }));
}
module.exports = { laborCost, revenue, expenses, monthly, bySite, byWorker };
