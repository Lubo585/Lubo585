const router = require('express').Router();
const U = require('../utils');
const R = require('../services/reports');
const { all } = require('../db');

router.get('/', (req, res) => {
  const today = U.today();
  const from = req.query.from || (today.slice(0, 4) + '-01-01');
  const to = req.query.to || today;
  const monthly = R.monthly(parseInt(req.query.months, 10) || 12);
  const rev = R.revenue(from, to), exp = R.expenses(from, to), lab = R.laborCost(from, to);
  const laborEffective = exp.wagesNet > 0 ? 0 : lab.cost;
  const sites = R.bySite(from, to);
  const workers = R.byWorker(from, to);
  const receivables = all("SELECT c.name, SUM(i.amount_due - i.paid_amount) AS open, SUM(CASE WHEN i.due_date < ? THEN i.amount_due - i.paid_amount ELSE 0 END) AS overdue, SUM(i.retention_amount - i.retention_paid) AS retention FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.status IN ('issued','partial') OR (i.status='paid' AND i.retention_amount > i.retention_paid + 0.005) GROUP BY c.id ORDER BY open DESC", [today]);
  res.render('reports/index', { title: 'Prehľady a zisk', from, to, monthly, rev, exp, lab, laborEffective, profit: U.round2(rev.net - exp.net - laborEffective), sites, workers, receivables });
});
module.exports = router;
