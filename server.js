require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cron = require('node-cron');

const { getSettings, getSetting, log } = require('./src/db');
const U = require('./src/utils');
const INV = require('./src/services/invoices');
const reminders = require('./src/services/reminders');
const imap = require('./src/services/imap');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'agentura-dev-secret',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 },
}));

// globálne premenné pre šablóny + flash správy
app.use((req, res, next) => {
  res.locals.U = U;
  res.locals.INV = INV;
  res.locals.user = req.session.user || null;
  res.locals.settings = getSettings();
  res.locals.path = req.path;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  req.flash = (type, text) => { req.session.flash = { type, text }; };
  next();
});

app.use(require('./src/routes/auth'));
app.use((req, res, next) => { if (!req.session.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl)); next(); });
app.use(require('./src/routes/dashboard'));
app.use('/workers', require('./src/routes/workers'));
app.use('/clients', require('./src/routes/clients'));
app.use('/timesheets', require('./src/routes/timesheets'));
app.use('/expenses', require('./src/routes/expenses'));
app.use('/invoices', require('./src/routes/invoices'));
app.use('/bank', require('./src/routes/bank'));
app.use('/reports', require('./src/routes/reports'));
app.use('/settings', require('./src/routes/settings'));

app.use((req, res) => res.status(404).render('error', { title: 'Nenájdené', message: 'Stránka neexistuje.' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).render('error', { title: 'Chyba', message: err.message });
});

// ---------- plánované úlohy ----------
// upomienky: každý deň o 8:00
cron.schedule('0 8 * * *', () => reminders.runDaily().catch((e) => log('error', 'Upomienky: ' + e.message)));
// kontrola e-mailovej schránky s výpismi: každých N minút podľa nastavenia (kontrola každú minútu, beh podľa intervalu)
let lastImap = 0;
cron.schedule('* * * * *', () => {
  const s = getSettings();
  if (s.imap_enabled !== '1') return;
  const interval = Math.max(1, Number(s.imap_interval_minutes) || 15) * 60000;
  if (Date.now() - lastImap < interval) return;
  lastImap = Date.now();
  imap.checkMailbox().catch((e) => log('error', 'IMAP: ' + e.message));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Aplikácia beží na http://localhost:${PORT}`));
}
module.exports = app;
