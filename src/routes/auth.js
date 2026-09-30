const router = require('express').Router();
const { get, verifyPassword } = require('../db');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Prihlásenie', error: null, next: req.query.next || '/' });
});
router.post('/login', (req, res) => {
  const u = get('SELECT * FROM users WHERE username = ?', [String(req.body.username || '').trim()]);
  if (!u || !verifyPassword(String(req.body.password || ''), u.password_hash)) {
    return res.status(401).render('login', { title: 'Prihlásenie', error: 'Nesprávne meno alebo heslo.', next: req.body.next || '/' });
  }
  req.session.user = { id: u.id, username: u.username, name: u.name, role: u.role };
  const next = String(req.body.next || '/');
  res.redirect(next.startsWith('/') ? next : '/');
});
router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
module.exports = router;
