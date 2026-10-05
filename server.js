require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cron = require('node-cron');

const { getSettings, log, backupDatabase, ROLES, SCHEMA_VERSION } = require('./src/db');
const SqliteStore = require('./src/session-store');
const { requireLogin, csrfGuard, allowed } = require('./src/auth');
const U = require('./src/utils');
const INV = require('./src/services/invoices');
const reminders = require('./src/services/reminders');
const imap = require('./src/services/imap');
const attachments = require('./src/services/attachments');
const pkg = require('./package.json');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('trust proxy', 1); // beh za reverznou proxy (Caddy/nginx) s HTTPS
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '5mb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));
app.get('/manifest.webmanifest', (req, res) => { res.type('application/manifest+json'); res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest')); });
app.get('/sw.js', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'public', 'sw.js')); });
app.get('/health', (req, res) => res.json({ ok: true, version: pkg.version, schema: SCHEMA_VERSION, time: new Date().toISOString() }));

const secure = process.env.COOKIE_SECURE === '1' || process.env.NODE_ENV === 'production';
app.use(session({
  store: new SqliteStore(),
  secret: process.env.SESSION_SECRET || 'agentura-dev-secret',
  name: 'agentura.sid',
  resave: false, saveUninitialized: false, rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure, maxAge: 1000 * 60 * 60 * 24 * 14 },
}));
app.use(csrfGuard);

// globálne premenné pre šablóny + flash správy
app.use((req, res, next) => {
  res.locals.U = U;
  res.locals.INV = INV;
  res.locals.ROLES = ROLES;
  res.locals.user = req.session.user || null;
  res.locals.settings = getSettings();
  res.locals.path = req.path;
  res.locals.allowed = (p) => (req.session.user ? allowed(req.session.user.role, p) : false);
  res.locals.attachmentsFor = (type, id) => attachments.list(type, id);
  res.locals.appVersion = pkg.version;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  req.flash = (type, text) => { req.session.flash = { type, text }; };
  next();
});

app.use(require('./src/routes/auth'));
app.use(requireLogin);
app.use('/portal', require('./src/routes/portal'));
app.use(require('./src/routes/dashboard'));
app.use('/attachments', require('./src/routes/attachments'));
app.use('/workers', require('./src/routes/workers'));
app.use('/clients', require('./src/routes/clients'));
app.use('/orders', require('./src/routes/orders'));
app.use('/tasks', require('./src/routes/tasks'));
app.use('/timesheets', require('./src/routes/timesheets'));
app.use('/planning', require('./src/routes/planning'));
app.use('/compliance', require('./src/routes/compliance'));
app.use('/expenses', require('./src/routes/expenses'));
app.use('/invoices', require('./src/routes/invoices'));
app.use('/quotes', require('./src/routes/quotes'));
app.use('/bank', require('./src/routes/bank'));
app.use('/lodging', require('./src/routes/lodging'));
app.use('/vehicles', require('./src/routes/vehicles'));
app.use('/settlements', require('./src/routes/settlements'));
app.use('/reports', require('./src/routes/reports'));
app.use('/finance', require('./src/routes/finance'));
app.use('/settings', require('./src/routes/settings'));
app.use('/assistant', require('./src/routes/assistant'));

app.use((req, res) => res.status(404).render('error', { title: 'Nenájdené', message: 'Stránka neexistuje.' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (req.headers.accept && req.headers.accept.includes('application/json')) return res.status(500).json({ error: err.message });
  res.status(500).render('error', { title: 'Chyba', message: err.message });
});

// ---------- plánované úlohy ----------
// upomienky: každý deň o 8:00
cron.schedule('0 8 * * *', () => reminders.runDaily().catch((e) => log('error', 'Upomienky: ' + e.message)));
// nočná záloha databázy o 2:30
cron.schedule('30 2 * * *', () => { if (getSettings().backup_enabled === '1') { const b = backupDatabase('nightly'); if (b) log('backup', 'Nočná záloha: ' + path.basename(b)); } });
// kontrola e-mailovej schránky s výpismi podľa intervalu
let lastImap = 0;
cron.schedule('* * * * *', () => {
  const s = getSettings();
  if (s.imap_enabled !== '1') return;
  const interval = Math.max(1, Number(s.imap_interval_minutes) || 15) * 60000;
  if (Date.now() - lastImap < interval) return;
  lastImap = Date.now();
  imap.checkMailbox().catch((e) => log('error', 'IMAP: ' + e.message));
});

// ukážkové dáta pri štarte (pre testovacie nasadenie, napr. Render): DEMO_SEED=1
if (process.env.DEMO_SEED === '1') { try { require('./scripts/demo').seed(false); } catch (e) { console.error('Ukážkové dáta:', e.message); } }

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Aplikácia ${pkg.version} (schéma v${SCHEMA_VERSION}) beží na http://localhost:${PORT}`));
}
module.exports = app;
