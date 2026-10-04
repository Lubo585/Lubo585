// Portál pracovníka: vlastné hodiny, vyúčtovania, doklady, plán
const router = require('express').Router();
const { all, get } = require('../db');
const U = require('../utils');
const C = require('../services/compliance');

router.use((req, res, next) => { if (!req.session.user.worker_id && req.session.user.role === 'worker') return res.status(403).render('error', { title: 'Portál', message: 'Váš účet nie je prepojený s kartou pracovníka. Kontaktujte kanceláriu.' }); next(); });
router.get('/', (req, res) => {
  const wid = req.session.user.worker_id || parseInt(req.query.worker_id, 10);
  const w = get('SELECT * FROM workers WHERE id = ?', [wid]);
  if (!w) return res.status(404).render('error', { title: 'Portál', message: 'Pracovník neexistuje.' });
  const sheets = all(`SELECT t.id, t.week_start, t.status, t.signed_at, s.name AS site_name, r.d1, r.d2, r.d3, r.d4, r.d5, r.d6, r.d7, (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) AS hours FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id WHERE r.worker_id = ? ORDER BY t.week_start DESC LIMIT 20`, [wid]);
  const settlements = all('SELECT * FROM settlements WHERE worker_id = ? ORDER BY month DESC LIMIT 12', [wid]);
  const docs = all('SELECT * FROM worker_documents WHERE worker_id = ? ORDER BY valid_to', [wid]).map((d) => ({ ...d, type_label: C.DOC_TYPES[d.type] || d.type, days_left: d.valid_to ? U.diffDays(d.valid_to, U.today()) : null }));
  const plan = all('SELECT a.*, s.name AS site_name, s.address FROM assignments a LEFT JOIN sites s ON s.id = a.site_id WHERE a.worker_id = ? AND a.date_to >= ? ORDER BY a.date_from LIMIT 10', [wid, U.today()]);
  const tasks = all("SELECT * FROM tasks WHERE worker_id = ? AND status IN ('new','progress','waiting') ORDER BY COALESCE(due_date,'9999')", [wid]);
  const monthHours = U.round2(sheets.filter((s) => s.week_start >= U.addDays(U.monthStart(), -6)).reduce((a, s) => a + s.hours, 0));
  const balance = U.round2(all('SELECT * FROM worker_transactions WHERE worker_id = ? AND settlement_id IS NULL', [wid]).reduce((a, t) => a + (t.type === 'bonus' ? t.amount : -t.amount), 0));
  res.render('portal/index', { title: 'Môj portál', w, sheets, settlements, docs, plan, tasks, monthHours, balance, ASSIGNMENT_TYPES: C.ASSIGNMENT_TYPES });
});
module.exports = router;
