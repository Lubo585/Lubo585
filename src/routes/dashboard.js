const router = require('express').Router();
const { all, get } = require('../db');
const U = require('../utils');
const INV = require('../services/invoices');
const R = require('../services/reports');

router.get('/', (req, res) => {
  const today = U.today();
  const from = U.monthStart(today), to = U.monthEnd(today);
  const rev = R.revenue(from, to), exp = R.expenses(from, to), lab = R.laborCost(from, to);
  const laborEffective = exp.wagesNet > 0 ? 0 : lab.cost;
  const overdue = all(`SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status IN ('issued','partial') AND i.due_date < ? ORDER BY i.due_date`, [today]);
  const dueSoon = all(`SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status IN ('issued','partial') AND i.due_date >= ? AND i.due_date <= ? ORDER BY i.due_date`, [today, U.addDays(today, 7)]);
  const retention = all(`SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status != 'cancelled' AND i.retention_amount > i.retention_paid + 0.005 ORDER BY i.retention_due_date`);
  const unmatched = all(`SELECT * FROM bank_transactions WHERE match_status = 'unmatched' AND amount > 0 ORDER BY date DESC LIMIT 10`);
  const unmatchedCount = get(`SELECT COUNT(*) AS n FROM bank_transactions WHERE match_status = 'unmatched' AND amount > 0`).n;
  const draftSheets = all(`SELECT t.*, s.name AS site_name, c.name AS client_name FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE t.status='draft' ORDER BY t.week_start DESC LIMIT 10`);
  const uninvoiced = get(`SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) AS hours FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.status='approved' AND r.invoice_id IS NULL`).hours;
  const thisWeek = U.weekStart(today);
  const weekHours = get(`SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) AS hours, COUNT(DISTINCT r.worker_id) AS workers FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.week_start = ?`, [thisWeek]);
  const receivables = get(`SELECT COALESCE(SUM(amount_due - paid_amount),0) AS s FROM invoices WHERE status IN ('issued','partial')`).s;
  const overdueSum = overdue.reduce((s, i) => s + INV.remaining(i), 0);
  const activity = all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 12');
  const monthly = R.monthly(6);
  res.render('dashboard', { title: 'Prehľad', rev, exp, lab, laborEffective, profit: U.round2(rev.net - exp.net - laborEffective), overdue, dueSoon, retention, unmatched, unmatchedCount, draftSheets, uninvoiced, weekHours, receivables, overdueSum, activity, monthly, from, to });
});
module.exports = router;
