// Roly a prístupové práva
const { ROLES } = require('./db');

// ktoré roly smú na ktoré časti aplikácie (prefix cesty -> roly); admin smie všade
const ACCESS = [
  ['/portal', ['worker']],
  ['/settings', ['admin']],
  ['/attachments', ['admin', 'office', 'dispatcher', 'accountant', 'worker']],
  ['/assistant', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/invoices', ['admin', 'office', 'accountant']],
  ['/quotes', ['admin', 'office', 'accountant']],
  ['/bank', ['admin', 'accountant']],
  ['/expenses', ['admin', 'office', 'accountant']],
  ['/reports', ['admin', 'accountant']],
  ['/finance', ['admin', 'accountant']],
  ['/settlements', ['admin', 'office', 'accountant']],
  ['/compliance', ['admin', 'office', 'dispatcher']],
  ['/planning', ['admin', 'office', 'dispatcher']],
  ['/timesheets', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/workers', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/clients', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/orders', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/tasks', ['admin', 'office', 'dispatcher', 'accountant']],
  ['/', ['admin', 'office', 'dispatcher', 'accountant']],
];
function allowed(role, path) {
  if (role === 'admin') return true;
  for (const [prefix, roles] of ACCESS) if (prefix === '/' ? path === '/' : path.startsWith(prefix)) return roles.includes(role);
  return false;
}
function requireLogin(req, res, next) {
  if (!req.session.user) {
    if (req.headers.accept && req.headers.accept.includes('application/json')) return res.status(401).json({ error: 'Nie ste prihlásený.' });
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  const role = req.session.user.role || 'office';
  if (!allowed(role, req.path)) {
    if (role === 'worker') return res.redirect('/portal');
    return res.status(403).render('error', { title: 'Prístup zamietnutý', message: 'Na túto časť aplikácie nemáte oprávnenie (rola: ' + (ROLES[role] || role) + ').' });
  }
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session.user && req.session.user.role;
    if (role === 'admin' || roles.includes(role)) return next();
    res.status(403).render('error', { title: 'Prístup zamietnutý', message: 'Na túto akciu nemáte oprávnenie.' });
  };
}
// Ochrana proti CSRF: zmeny (POST) prijímame iba z vlastnej stránky (Sec-Fetch-Site / Origin)
function csrfGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const site = req.headers['sec-fetch-site'];
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return res.status(403).send('Požiadavka z cudzej stránky bola zamietnutá.');
  const origin = req.headers.origin;
  if (origin) {
    try { const o = new URL(origin).host; if (o !== req.headers.host) return res.status(403).send('Požiadavka z cudzej stránky bola zamietnutá.'); } catch (_) { return res.status(403).send('Neplatný pôvod požiadavky.'); }
  }
  next();
}
// Ochrana prihlásenia proti hádaniu hesla: max. 10 pokusov za 15 minút na IP + meno
const attempts = new Map();
function loginLimiter(req, res, next) {
  const key = (req.ip || '') + '|' + String(req.body.username || '').toLowerCase();
  const now = Date.now(); const a = attempts.get(key) || { n: 0, until: 0 };
  if (a.until > now) return res.status(429).render('login', { title: 'Prihlásenie', error: `Príliš veľa pokusov. Skúste o ${Math.ceil((a.until - now) / 60000)} min.`, next: '/', mode: 'login' });
  req.loginFailed = () => { a.n++; if (a.n >= 10) { a.until = now + 15 * 60000; a.n = 0; } attempts.set(key, a); };
  req.loginOk = () => attempts.delete(key);
  next();
}
setInterval(() => { const now = Date.now(); for (const [k, a] of attempts) if (a.until < now && a.n === 0) attempts.delete(k); }, 10 * 60000).unref();
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}
module.exports = { requireLogin, requireRole, csrfGuard, allowed, ACCESS, loginLimiter, securityHeaders };
