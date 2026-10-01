const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');

const STATUSES = { new: ['Nová', 'info'], progress: ['Rozpracovaná', 'warn'], waiting: ['Čaká sa', 'muted'], done: ['Hotová', 'ok'], cancelled: ['Zrušená', 'muted'] };
const PRIORITIES = { low: ['Nízka', 'muted'], normal: ['Bežná', ''], high: ['Vysoká', 'danger'] };

function formData() {
  return {
    users: all('SELECT id, username, name FROM users ORDER BY name, username'),
    clients: all('SELECT id, name FROM clients WHERE active = 1 ORDER BY name'),
    sites: all("SELECT id, client_id, name FROM sites WHERE status != 'finished' ORDER BY name"),
    workers: all('SELECT id, first_name, last_name FROM workers WHERE active = 1 ORDER BY last_name'),
    STATUSES, PRIORITIES,
  };
}
const BASE = `SELECT t.*, ub.name AS by_name, ub.username AS by_user, ut.name AS to_name, ut.username AS to_user,
    c.name AS client_name, s.name AS site_name, w.first_name AS w_first, w.last_name AS w_last,
    (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id AND tc.type = 'comment') AS comments
  FROM tasks t LEFT JOIN users ub ON ub.id = t.assigned_by LEFT JOIN users ut ON ut.id = t.assigned_to
  LEFT JOIN clients c ON c.id = t.client_id LEFT JOIN sites s ON s.id = t.site_id LEFT JOIN workers w ON w.id = t.worker_id`;

router.get('/', (req, res) => {
  const f = req.query.filter || 'open';
  const me = req.session.user.id;
  const params = []; let where = '1=1';
  if (f === 'open') where = "t.status IN ('new','progress','waiting')";
  else if (f === 'mine') { where = "t.assigned_to = ? AND t.status IN ('new','progress','waiting')"; params.push(me); }
  else if (f === 'byme') { where = "t.assigned_by = ? AND t.status IN ('new','progress','waiting')"; params.push(me); }
  else if (f === 'done') where = "t.status IN ('done','cancelled')";
  if (req.query.user) { where += ' AND t.assigned_to = ?'; params.push(req.query.user); }
  const tasks = all(`${BASE} WHERE ${where} ORDER BY CASE t.status WHEN 'progress' THEN 0 WHEN 'new' THEN 1 WHEN 'waiting' THEN 2 ELSE 3 END,
    CASE t.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, COALESCE(t.due_date, '9999') , t.id DESC LIMIT 300`, params);
  const counts = {
    open: get("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('new','progress','waiting')").n,
    mine: get("SELECT COUNT(*) AS n FROM tasks WHERE assigned_to = ? AND status IN ('new','progress','waiting')", [me]).n,
    byme: get("SELECT COUNT(*) AS n FROM tasks WHERE assigned_by = ? AND status IN ('new','progress','waiting')", [me]).n,
    done: get("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('done','cancelled')").n,
    overdue: get("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('new','progress','waiting') AND due_date < ?", [U.today()]).n,
  };
  res.render('tasks/index', { title: 'Úlohy', tasks, counts, f, user_filter: req.query.user || '', ...formData() });
});
router.get('/new', (req, res) => res.render('tasks/form', { title: 'Nová úloha', t: { status: 'new', priority: 'normal', assigned_to: req.session.user.id, client_id: req.query.client_id || '', site_id: req.query.site_id || '' }, ...formData() }));
router.get('/:id/edit', (req, res) => {
  const t = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).render('error', { title: 'Chyba', message: 'Úloha neexistuje' });
  res.render('tasks/form', { title: 'Upraviť úlohu', t, ...formData() });
});
router.post('/save', (req, res) => {
  const b = req.body; const me = req.session.user.id;
  const vals = [b.title.trim(), b.description || '', b.priority || 'normal', b.assigned_to || null, b.client_id || null, b.site_id || null, b.worker_id || null, b.due_date || null];
  let id = b.id;
  if (id) {
    const old = get('SELECT * FROM tasks WHERE id = ?', [id]);
    run("UPDATE tasks SET title=?, description=?, priority=?, assigned_to=?, client_id=?, site_id=?, worker_id=?, due_date=?, updated_at=datetime('now') WHERE id=?", [...vals, id]);
    if (old && String(old.assigned_to || '') !== String(b.assigned_to || '')) {
      const u = get('SELECT name, username FROM users WHERE id = ?', [b.assigned_to]);
      run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (?,?,'assign',?)", [id, me, 'Úloha pridelená: ' + (u ? (u.name || u.username) : '–')]);
    }
    req.flash('ok', 'Úloha uložená.');
  } else {
    const r = run("INSERT INTO tasks(title, description, priority, assigned_to, client_id, site_id, worker_id, due_date, assigned_by, status) VALUES (?,?,?,?,?,?,?,?,?,'new')", [...vals, me]);
    id = Number(r.lastInsertRowid);
    const u = get('SELECT name, username FROM users WHERE id = ?', [b.assigned_to]);
    run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (?,?,'assign',?)", [id, me, 'Úloha vytvorená a pridelená: ' + (u ? (u.name || u.username) : '–')]);
    log('task', `Nová úloha „${b.title.trim()}“ pre ${u ? (u.name || u.username) : '–'}`);
    req.flash('ok', 'Úloha vytvorená.');
  }
  res.redirect('/tasks/' + id);
});
router.get('/:id', (req, res) => {
  const t = get(`${BASE} WHERE t.id = ?`, [req.params.id]);
  if (!t) return res.status(404).render('error', { title: 'Chyba', message: 'Úloha neexistuje' });
  const comments = all('SELECT tc.*, u.name, u.username FROM task_comments tc LEFT JOIN users u ON u.id = tc.user_id WHERE tc.task_id = ? ORDER BY tc.id', [t.id]);
  res.render('tasks/detail', { title: t.title, t, comments, STATUSES, PRIORITIES });
});
router.post('/:id/status', (req, res) => {
  const t = get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!t || !STATUSES[req.body.status]) return res.redirect('/tasks');
  const st = req.body.status;
  run("UPDATE tasks SET status=?, done_at=?, updated_at=datetime('now') WHERE id=?", [st, st === 'done' ? U.today() : null, t.id]);
  run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (?,?,'status',?)", [t.id, req.session.user.id, 'Stav zmenený na: ' + STATUSES[st][0] + (req.body.text ? ' – ' + req.body.text : '')]);
  if (st === 'done') log('task', `Úloha „${t.title}“ dokončená`);
  req.flash('ok', 'Stav úlohy zmenený.');
  res.redirect('/tasks/' + t.id);
});
router.post('/:id/comment', (req, res) => {
  if ((req.body.text || '').trim()) {
    run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (?,?,'comment',?)", [req.params.id, req.session.user.id, req.body.text.trim()]);
    run("UPDATE tasks SET updated_at=datetime('now') WHERE id=?", [req.params.id]);
  }
  res.redirect('/tasks/' + req.params.id);
});
router.post('/:id/delete', (req, res) => { run('DELETE FROM tasks WHERE id = ?', [req.params.id]); req.flash('ok', 'Úloha odstránená.'); res.redirect('/tasks'); });

module.exports = router;
module.exports.STATUSES = STATUSES;
