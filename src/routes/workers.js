const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');

router.get('/', (req, res) => {
  const showAll = req.query.all === '1';
  const workers = all(`SELECT w.*, (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE r.worker_id=w.id AND t.week_start >= ?) AS hours_month
    FROM workers w ${showAll ? '' : 'WHERE w.active = 1'} ORDER BY w.last_name, w.first_name`, [U.monthStart()]);
  res.render('workers/index', { title: 'Pracovníci', workers, showAll });
});
router.get('/new', (req, res) => res.render('workers/form', { title: 'Nový pracovník', w: { active: 1, hourly_cost: 0 } }));
router.get('/:id/edit', (req, res) => {
  const w = get('SELECT * FROM workers WHERE id = ?', [req.params.id]);
  if (!w) return res.status(404).render('error', { title: 'Chyba', message: 'Pracovník neexistuje' });
  res.render('workers/form', { title: 'Upraviť pracovníka', w });
});
router.post('/save', (req, res) => {
  const b = req.body;
  const vals = [b.first_name.trim(), b.last_name.trim(), b.nationality || '', b.position || '', b.phone || '', b.email || '', U.num(b.hourly_cost), b.hourly_rate ? U.num(b.hourly_rate) : null, b.active ? 1 : 0, b.note || ''];
  if (b.id) { run('UPDATE workers SET first_name=?, last_name=?, nationality=?, position=?, phone=?, email=?, hourly_cost=?, hourly_rate=?, active=?, note=? WHERE id=?', [...vals, b.id]); req.flash('ok', 'Pracovník uložený.'); }
  else { run('INSERT INTO workers(first_name, last_name, nationality, position, phone, email, hourly_cost, hourly_rate, active, note) VALUES (?,?,?,?,?,?,?,?,?,?)', vals); req.flash('ok', 'Pracovník pridaný.'); log('worker', `Pridaný pracovník ${b.last_name} ${b.first_name}`); }
  res.redirect('/workers');
});
router.post('/:id/delete', (req, res) => {
  const used = get('SELECT COUNT(*) AS n FROM timesheet_rows WHERE worker_id = ?', [req.params.id]).n;
  if (used) { run('UPDATE workers SET active = 0 WHERE id = ?', [req.params.id]); req.flash('warn', 'Pracovník má záznamy v hodinových lístkoch, bol iba deaktivovaný.'); }
  else { run('DELETE FROM workers WHERE id = ?', [req.params.id]); req.flash('ok', 'Pracovník odstránený.'); }
  res.redirect('/workers');
});
module.exports = router;
