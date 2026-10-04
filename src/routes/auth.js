const router = require('express').Router();
const crypto = require('crypto');
const { all, get, run, verifyPassword, hashPassword, getSettings, log, ROLES } = require('../db');
const U = require('../utils');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === 'worker' ? '/portal' : '/');
  res.render('login', { title: 'Prihlásenie', error: null, next: req.query.next || '/', mode: 'login' });
});
router.post('/login', (req, res) => {
  const u = get('SELECT * FROM users WHERE username = ? OR email = ?', [String(req.body.username || '').trim(), String(req.body.username || '').trim().toLowerCase()]);
  if (!u || !u.active || !verifyPassword(String(req.body.password || ''), u.password_hash)) {
    log('auth', `Neúspešné prihlásenie: ${String(req.body.username || '').slice(0, 40)}`);
    return res.status(401).render('login', { title: 'Prihlásenie', error: 'Nesprávne meno alebo heslo.', next: req.body.next || '/', mode: 'login' });
  }
  req.session.regenerate(() => {
    req.session.user = { id: u.id, username: u.username, name: u.name, role: u.role || 'admin', worker_id: u.worker_id };
    run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [u.id]);
    const next = String(req.body.next || '/');
    res.redirect(u.role === 'worker' ? '/portal' : (next.startsWith('/') && !next.startsWith('//') ? next : '/'));
  });
});
router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

// ---- registrácia cez pozvánku ----
router.get('/register/:token', (req, res) => {
  const inv = get("SELECT * FROM invites WHERE token = ? AND used_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))", [req.params.token]);
  if (!inv) return res.status(404).render('login', { title: 'Pozvánka', error: 'Pozvánka je neplatná alebo už bola použitá.', next: '/', mode: 'invalid' });
  res.render('login', { title: 'Registrácia', error: null, next: '/', mode: 'register', inv, ROLES });
});
router.post('/register/:token', (req, res) => {
  const inv = get("SELECT * FROM invites WHERE token = ? AND used_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))", [req.params.token]);
  if (!inv) return res.status(404).render('login', { title: 'Pozvánka', error: 'Pozvánka je neplatná alebo už bola použitá.', next: '/', mode: 'invalid' });
  const username = String(req.body.username || '').trim().toLowerCase();
  const err = !/^[a-z0-9._-]{3,40}$/.test(username) ? 'Prihlasovacie meno: 3–40 znakov, písmená, číslice, bodka, pomlčka.' : (req.body.password || '').length < 8 ? 'Heslo musí mať aspoň 8 znakov.' : req.body.password !== req.body.password2 ? 'Heslá sa nezhodujú.' : get('SELECT id FROM users WHERE username = ?', [username]) ? 'Používateľ s týmto menom už existuje.' : null;
  if (err) return res.status(400).render('login', { title: 'Registrácia', error: err, next: '/', mode: 'register', inv, ROLES });
  const r = run('INSERT INTO users(username, password_hash, name, role, email, worker_id) VALUES (?,?,?,?,?,?)', [username, hashPassword(req.body.password), (req.body.name || inv.name || '').trim(), inv.role, (req.body.email || inv.email || '').trim().toLowerCase() || null, inv.worker_id || null]);
  run("UPDATE invites SET used_at = datetime('now') WHERE id = ?", [inv.id]);
  log('user', `Registrácia cez pozvánku: ${username} (${ROLES[inv.role] || inv.role})`);
  req.session.user = { id: Number(r.lastInsertRowid), username, name: req.body.name || inv.name, role: inv.role, worker_id: inv.worker_id };
  res.redirect(inv.role === 'worker' ? '/portal' : '/');
});

// ---- zabudnuté heslo ----
router.get('/forgot', (req, res) => res.render('login', { title: 'Obnova hesla', error: null, next: '/', mode: 'forgot', sent: false }));
router.post('/forgot', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = email ? get('SELECT * FROM users WHERE lower(email) = ? AND active = 1', [email]) : null;
  if (u) {
    const token = crypto.randomBytes(24).toString('hex');
    run("INSERT INTO password_resets(user_id, token, expires_at) VALUES (?,?,datetime('now', '+2 hours'))", [u.id, token]);
    const s = getSettings();
    const base = s.app_url || (req.protocol + '://' + req.get('host'));
    try {
      await require('../services/mailer').sendMail({ to: email, subject: 'Obnova hesla – ' + s.company_name, text: `Dobrý deň,\n\npre nastavenie nového hesla otvorte tento odkaz (platí 2 hodiny):\n${base}/reset/${token}\n\nAk ste o obnovu nežiadali, správu ignorujte.` });
    } catch (e) { log('error', 'Obnova hesla, e-mail zlyhal: ' + e.message); }
  }
  res.render('login', { title: 'Obnova hesla', error: null, next: '/', mode: 'forgot', sent: true });
});
router.get('/reset/:token', (req, res) => {
  const r = get("SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')", [req.params.token]);
  if (!r) return res.status(404).render('login', { title: 'Obnova hesla', error: 'Odkaz je neplatný alebo vypršal.', next: '/', mode: 'invalid' });
  res.render('login', { title: 'Nové heslo', error: null, next: '/', mode: 'reset', token: req.params.token });
});
router.post('/reset/:token', (req, res) => {
  const r = get("SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')", [req.params.token]);
  if (!r) return res.status(404).render('login', { title: 'Obnova hesla', error: 'Odkaz je neplatný alebo vypršal.', next: '/', mode: 'invalid' });
  if ((req.body.password || '').length < 8 || req.body.password !== req.body.password2) return res.status(400).render('login', { title: 'Nové heslo', error: 'Heslo musí mať aspoň 8 znakov a obe polia sa musia zhodovať.', next: '/', mode: 'reset', token: req.params.token });
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(req.body.password), r.user_id]);
  run("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?", [r.id]);
  res.render('login', { title: 'Prihlásenie', error: null, next: '/', mode: 'login', info: 'Heslo bolo zmenené, prihláste sa.' });
});
module.exports = router;
