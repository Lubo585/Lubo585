const router = require('express').Router();
const { get, run, getSettings, setSetting, hashPassword, verifyPassword, DEFAULT_SETTINGS, all, log } = require('../db');
const mailer = require('../services/mailer');
const imap = require('../services/imap');
const reminders = require('../services/reminders');
const assistant = require('../services/assistant');

router.get('/', (req, res) => {
  const tab = req.query.tab || 'company';
  const due = tab === 'reminders' ? reminders.dueReminders() : [];
  const logs = tab === 'log' ? all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 200') : [];
  res.render('settings/index', { title: 'Nastavenia', s: getSettings(), tab, due, logs });
});
router.post('/save', (req, res) => {
  const tab = req.body.tab || 'company';
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (key in req.body) {
      if ((key === 'smtp_pass' || key === 'imap_pass' || key === 'ai_api_key') && req.body[key] === '') continue; // ponechať heslo
      setSetting(key, String(req.body[key]));
    }
  }
  // checkboxy
  for (const key of ['reminder_enabled', 'smtp_secure', 'imap_enabled', 'imap_secure']) if (req.body['_form_' + key]) setSetting(key, req.body[key] ? '1' : '0');
  req.flash('ok', 'Nastavenia uložené.');
  res.redirect('/settings?tab=' + tab);
});
router.post('/password', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  if (!verifyPassword(req.body.old_password || '', u.password_hash)) req.flash('err', 'Nesprávne pôvodné heslo.');
  else if ((req.body.new_password || '').length < 6) req.flash('err', 'Nové heslo musí mať aspoň 6 znakov.');
  else if (req.body.new_password !== req.body.new_password2) req.flash('err', 'Heslá sa nezhodujú.');
  else { run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(req.body.new_password), u.id]); req.flash('ok', 'Heslo zmenené.'); }
  res.redirect('/settings?tab=account');
});
router.post('/test-smtp', async (req, res) => {
  try {
    await mailer.testConnection();
    if (req.body.to) { await mailer.sendMail({ to: req.body.to, subject: 'Test – ' + getSettings().company_name, text: 'Testovací e-mail z firemnej aplikácie. SMTP funguje.' }); req.flash('ok', 'SMTP funguje, testovací e-mail odoslaný na ' + req.body.to); }
    else req.flash('ok', 'SMTP pripojenie funguje.');
  } catch (e) { req.flash('err', 'SMTP chyba: ' + e.message); }
  res.redirect('/settings?tab=email');
});
router.post('/test-imap', async (req, res) => {
  try { const n = await imap.testConnection(); req.flash('ok', `IMAP pripojenie funguje, v priečinku je ${n} správ.`); }
  catch (e) { req.flash('err', 'IMAP chyba: ' + e.message); }
  res.redirect('/settings?tab=bank');
});
router.post('/run-reminders', async (req, res) => {
  try {
    const due = reminders.dueReminders(); let sent = 0; const errs = [];
    for (const d of due) { try { await reminders.sendReminder(d.invoice.id, d.level); sent++; } catch (e) { errs.push(e.message); } }
    req.flash(errs.length ? 'warn' : 'ok', `Odoslaných upomienok: ${sent}.` + (errs.length ? ' Chyby: ' + errs.join(' | ') : ''));
  } catch (e) { req.flash('err', e.message); }
  res.redirect('/settings?tab=reminders');
});
router.post('/test-ai', async (req, res) => {
  try { const t = await assistant.testConnection(); req.flash('ok', 'AI asistent funguje. Odpoveď: ' + t.slice(0, 80)); }
  catch (e) { req.flash('err', 'AI chyba: ' + assistant.describeError(e)); }
  res.redirect('/settings?tab=ai');
});
router.post('/clear-ai-key', (req, res) => { setSetting('ai_api_key', ''); req.flash('ok', 'API kľúč odstránený.'); res.redirect('/settings?tab=ai'); });
router.post('/users/add', (req, res) => {
  if (!req.body.username || (req.body.password || '').length < 6) req.flash('err', 'Zadajte meno a heslo (min. 6 znakov).');
  else if (get('SELECT id FROM users WHERE username = ?', [req.body.username])) req.flash('err', 'Používateľ už existuje.');
  else { run('INSERT INTO users(username, password_hash, name, role) VALUES (?,?,?,?)', [req.body.username.trim(), hashPassword(req.body.password), req.body.name || '', 'user']); req.flash('ok', 'Používateľ pridaný.'); log('user', `Pridaný používateľ ${req.body.username}`); }
  res.redirect('/settings?tab=account');
});
module.exports = router;
