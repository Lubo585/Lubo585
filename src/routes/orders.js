// Zákazky (stavby): zoznam voľných, rozpracovaných a ukončených zákaziek
const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');

const STATUSES = { open: ['Voľná', 'info'], active: ['Rozpracovaná', 'warn'], finished: ['Ukončená', 'muted'] };
const BASE = `SELECT s.*, c.name AS client_name,
    (SELECT COUNT(DISTINCT r.worker_id) FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id WHERE t.site_id = s.id AND t.week_start >= ?) AS workers_now,
    (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id WHERE t.site_id = s.id) AS hours_total,
    (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id WHERE t.site_id = s.id AND t.status = 'approved' AND r.invoice_id IS NULL) AS hours_uninvoiced,
    (SELECT COUNT(*) FROM tasks k WHERE k.site_id = s.id AND k.status IN ('new','progress','waiting')) AS open_tasks,
    (SELECT MAX(t.week_start) FROM timesheets t WHERE t.site_id = s.id) AS last_week
  FROM sites s JOIN clients c ON c.id = s.client_id`;

router.get('/', (req, res) => {
  const f = req.query.filter || 'current';
  let where = "s.status IN ('open','active')";
  if (f === 'open') where = "s.status = 'open'";
  else if (f === 'active') where = "s.status = 'active'";
  else if (f === 'finished') where = "s.status = 'finished'";
  else if (f === 'all') where = '1=1';
  const params = [U.addDays(U.weekStart(), -7)];
  if (req.query.client) { where += ' AND s.client_id = ?'; params.push(req.query.client); }
  const orders = all(`${BASE} WHERE ${where} ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, c.name, s.name`, params);
  const counts = { open: get("SELECT COUNT(*) AS n FROM sites WHERE status='open'").n, active: get("SELECT COUNT(*) AS n FROM sites WHERE status='active'").n, finished: get("SELECT COUNT(*) AS n FROM sites WHERE status='finished'").n };
  const clients = all('SELECT id, name FROM clients ORDER BY name');
  res.render('orders/index', { title: 'Zákazky', orders, counts, f, STATUSES, clients, client: req.query.client || '' });
});
function formData() { return { clients: all('SELECT id, name FROM clients WHERE active = 1 ORDER BY name'), STATUSES }; }
router.get('/new', (req, res) => res.render('orders/form', { title: 'Nová zákazka', o: { status: 'open', client_id: req.query.client_id || '', hourly_rate: res.locals.settings.default_hourly_rate, workers_needed: 0 }, ...formData() }));
router.get('/:id/edit', (req, res) => {
  const o = get('SELECT * FROM sites WHERE id = ?', [req.params.id]);
  if (!o) return res.status(404).render('error', { title: 'Chyba', message: 'Zákazka neexistuje' });
  res.render('orders/form', { title: 'Upraviť zákazku', o, ...formData() });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const status = STATUSES[b.status] ? b.status : 'open';
  const vals = [b.client_id, b.name.trim(), b.address || '', U.num(b.hourly_rate), b.overtime_rate ? U.num(b.overtime_rate) : null, status === 'finished' ? 0 : 1, b.note || '', status, b.start_date || null, b.end_date || null, parseInt(b.workers_needed, 10) || 0, b.description || '', b.contact_person || '', b.contact_phone || '', b.soka_bau ? 1 : 0, (b.country || 'DE').toUpperCase().slice(0, 2), b.profession || '', U.num(b.hours_per_day, 8) || 8];
  let id = b.id;
  if (id) { run('UPDATE sites SET client_id=?, name=?, address=?, hourly_rate=?, overtime_rate=?, active=?, note=?, status=?, start_date=?, end_date=?, workers_needed=?, description=?, contact_person=?, contact_phone=?, soka_bau=?, country=?, profession=?, hours_per_day=? WHERE id=?', [...vals, id]); req.flash('ok', 'Zákazka uložená.'); }
  else { const r = run('INSERT INTO sites(client_id, name, address, hourly_rate, overtime_rate, active, note, status, start_date, end_date, workers_needed, description, contact_person, contact_phone, soka_bau, country, profession, hours_per_day) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', vals); id = r.lastInsertRowid; log('order', `Nová zákazka „${b.name.trim()}“`); req.flash('ok', 'Zákazka pridaná.'); }
  res.redirect('/orders/' + id);
});
router.get('/:id', (req, res) => {
  const o = get(`${BASE} WHERE s.id = ?`, [U.addDays(U.weekStart(), -7), req.params.id]);
  if (!o) return res.status(404).render('error', { title: 'Chyba', message: 'Zákazka neexistuje' });
  const sheets = all(`SELECT t.*, (SELECT COUNT(*) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS workers, (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS hours FROM timesheets t WHERE t.site_id = ? ORDER BY t.week_start DESC LIMIT 30`, [o.id]);
  const workers = all(`SELECT w.id, w.first_name, w.last_name, w.position, SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) AS hours, MAX(t.week_start) AS last_week FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN workers w ON w.id=r.worker_id WHERE t.site_id = ? GROUP BY w.id ORDER BY last_week DESC, hours DESC`, [o.id]);
  const invoices = all('SELECT * FROM invoices WHERE site_id = ? ORDER BY issue_date DESC', [o.id]);
  const tasks = all(`SELECT k.*, u.name AS to_name, u.username AS to_user FROM tasks k LEFT JOIN users u ON u.id=k.assigned_to WHERE k.site_id = ? AND k.status IN ('new','progress','waiting') ORDER BY COALESCE(k.due_date,'9999')`, [o.id]);
  res.render('orders/detail', { title: o.name, o, sheets, workers, invoices, tasks, STATUSES, TASK_STATUSES: require('./tasks').STATUSES });
});
router.post('/:id/status', (req, res) => {
  if (STATUSES[req.body.status]) { run("UPDATE sites SET status = ?, active = ? WHERE id = ?", [req.body.status, req.body.status === 'finished' ? 0 : 1, req.params.id]); req.flash('ok', 'Stav zákazky zmenený.'); }
  res.redirect('/orders/' + req.params.id);
});
router.post('/:id/delete', (req, res) => {
  const used = get('SELECT COUNT(*) AS n FROM timesheets WHERE site_id = ?', [req.params.id]).n;
  if (used) { run("UPDATE sites SET status='finished', active=0 WHERE id = ?", [req.params.id]); req.flash('warn', 'Zákazka má hodinové lístky, bola iba označená ako ukončená.'); return res.redirect('/orders/' + req.params.id); }
  run('DELETE FROM sites WHERE id = ?', [req.params.id]); req.flash('ok', 'Zákazka odstránená.'); res.redirect('/orders');
});
module.exports = router;
