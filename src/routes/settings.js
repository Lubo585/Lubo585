const router = require('express').Router();
const { get, run, getSettings, setSetting, hashPassword, verifyPassword, DEFAULT_SETTINGS, all, log, ROLES, backupDatabase, SCHEMA_VERSION } = require('../db');
const crypto = require('crypto');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const U = require('../utils');
const mailer = require('../services/mailer');
const imap = require('../services/imap');
const reminders = require('../services/reminders');
const assistant = require('../services/assistant');

router.get('/', (req, res) => {
  const tab = req.query.tab || 'company';
  const due = tab === 'reminders' ? reminders.dueReminders() : [];
  const logs = tab === 'log' ? all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 200') : [];
  const users = tab === 'account' ? all('SELECT u.*, w.first_name, w.last_name FROM users u LEFT JOIN workers w ON w.id = u.worker_id ORDER BY u.active DESC, u.role, u.username') : [];
  const invites = tab === 'account' ? all("SELECT * FROM invites WHERE used_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY id DESC") : [];
  const workers = tab === 'account' ? all('SELECT id, first_name, last_name FROM workers WHERE active = 1 ORDER BY last_name') : [];
  const backups = tab === 'backup' ? (() => { try { const fs = require('fs'); const dir = require('path').join(require('path').dirname(require('../db').DB_PATH), 'backups'); return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.db')).sort().reverse().map((f) => ({ name: f, size: fs.statSync(require('path').join(dir, f)).size })) : []; } catch (e) { return []; } })() : [];
  const baseUrl = getSettings().app_url || (req.protocol + '://' + req.get('host'));
  res.render('settings/index', { title: 'Nastavenia', s: getSettings(), tab, due, logs, users, invites, workers, backups, baseUrl, schemaVersion: SCHEMA_VERSION });
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
  const role = ROLES[req.body.role] ? req.body.role : 'office';
  if (!req.body.username || (req.body.password || '').length < 8) req.flash('err', 'Zadajte meno a heslo (min. 8 znakov).');
  else if (get('SELECT id FROM users WHERE username = ?', [req.body.username.trim().toLowerCase()])) req.flash('err', 'Používateľ už existuje.');
  else { run('INSERT INTO users(username, password_hash, name, role, email, worker_id) VALUES (?,?,?,?,?,?)', [req.body.username.trim().toLowerCase(), hashPassword(req.body.password), req.body.name || '', role, (req.body.email || '').trim().toLowerCase() || null, req.body.worker_id || null]); req.flash('ok', 'Používateľ pridaný.'); log('user', `Pridaný používateľ ${req.body.username} (${ROLES[role]})`); }
  res.redirect('/settings?tab=account');
});
router.post('/users/:id/update', (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.redirect('/settings?tab=account');
  const a = req.body.action;
  if (a === 'deactivate' && u.id !== req.session.user.id) run('UPDATE users SET active = 0 WHERE id = ?', [u.id]);
  else if (a === 'activate') run('UPDATE users SET active = 1 WHERE id = ?', [u.id]);
  else if (a === 'role' && ROLES[req.body.role] && u.id !== req.session.user.id) run('UPDATE users SET role = ?, worker_id = ? WHERE id = ?', [req.body.role, req.body.role === 'worker' ? (req.body.worker_id || null) : null, u.id]);
  else if (a === 'password' && (req.body.password || '').length >= 8) run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(req.body.password), u.id]);
  else if (a === 'delete' && u.id !== req.session.user.id) run('DELETE FROM users WHERE id = ?', [u.id]);
  log('user', `Používateľ ${u.username}: ${a}`);
  req.flash('ok', 'Používateľ upravený.');
  res.redirect('/settings?tab=account');
});
router.post('/invites/add', (req, res) => {
  const role = ROLES[req.body.role] ? req.body.role : 'office';
  const token = crypto.randomBytes(18).toString('hex');
  run("INSERT INTO invites(token, role, email, name, worker_id, created_by, expires_at) VALUES (?,?,?,?,?,?,datetime('now', '+14 days'))", [token, role, (req.body.email || '').trim().toLowerCase() || null, (req.body.name || '').trim() || null, role === 'worker' ? (req.body.worker_id || null) : null, req.session.user.id]);
  log('user', `Vytvorená pozvánka (${ROLES[role]}) pre ${req.body.name || req.body.email || '–'}`);
  req.flash('ok', 'Pozvánka vytvorená, odkaz pošlite dotyčnej osobe (platí 14 dní).');
  res.redirect('/settings?tab=account');
});
router.post('/invites/:id/delete', (req, res) => { run('DELETE FROM invites WHERE id = ?', [req.params.id]); res.redirect('/settings?tab=account'); });
// ---- import klientov a pracovníkov z CSV (ostrá prevádzka: prenos existujúcich dát) ----
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
function parseCsv(text) {
  text = String(text).replace(/^\uFEFF/, ''); const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = (line) => { const out = []; let cur = ''; let q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === delim) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
  const headers = split(lines[0]).map(norm);
  return { headers, rows: lines.slice(1).map((l) => { const f = split(l); const o = {}; headers.forEach((h, i) => { o[h] = f[i] ?? ''; }); return o; }) };
}
const WORKER_COLS = { first_name: ['meno', 'firstname', 'vorname'], last_name: ['priezvisko', 'lastname', 'nachname'], nationality: ['narodnost', 'statnaprislusnost'], position: ['profesia', 'pozicia', 'position', 'beruf'], phone: ['telefon', 'tel', 'mobil'], email: ['email', 'e-mail'], hourly_cost: ['nakladovasadzba', 'naklad', 'nakladeurh', 'hourlycost'], wage_rate: ['mzda', 'mzdaeurh', 'mzdovasadzba', 'wagerate'], hourly_rate: ['fakturacnasadzba', 'sadzba'], birth_date: ['datumnarodenia', 'narodeny', 'birthdate'], iban: ['iban'], address: ['adresa', 'bydlisko'], id_number: ['cislodokladu', 'pas', 'cislopasu'], lohngruppe: ['lohngruppe', 'mzdovaskupina'], german_level: ['nemcina', 'german'] };
const CLIENT_COLS = { name: ['nazov', 'firma', 'klient', 'name', 'odberatel'], ico: ['ico', 'hrb', 'regno'], dic: ['dic', 'steuernummer'], ic_dph: ['icdph', 'ustidnr', 'vatid', 'dph'], address: ['adresa', 'sidlo', 'address'], email: ['email', 'e-mail'], invoice_email: ['emailfaktury', 'fakturacnyemail', 'rechnungsemail'], phone: ['telefon', 'tel'], contact_person: ['kontakt', 'kontaktnaosoba', 'contact'], country: ['krajina', 'country', 'land'], due_days: ['splatnost', 'splatnostdni', 'duedays'], retention_percent: ['zadrzne', 'zadrznepercent'], skonto_percent: ['skonto', 'skontopercent'], skonto_days: ['skontodni'] };
function pick(row, keys) { for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k]; return ''; }
router.get('/import', (req, res) => res.render('settings/import', { title: 'Import dát', result: null }));
router.get('/import/template/:what.csv', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="sablona-${req.params.what}.csv"`); res.type('text/csv');
  if (req.params.what === 'workers') return res.send('\uFEFFMeno;Priezvisko;Národnosť;Profesia;Telefón;E-mail;Nákladová sadzba;Mzda;Dátum narodenia;IBAN;Adresa;Číslo dokladu;Lohngruppe;Nemčina\r\nIvan;Kovalenko;Ukrajina;murár;+421900111222;ivan@example.com;10;8,5;1990-05-05;SK11...;Bratislava;FE123456;LG 3;A2\r\n');
  res.send('\uFEFFNázov;IČO;DIČ;IČ DPH;Adresa;E-mail;E-mail faktúry;Telefón;Kontakt;Krajina;Splatnosť;Zádržné;Skonto;Skonto dni\r\nBauunternehmen Müller GmbH;HRB 24871;143/123/45678;DE811234567;Industriestraße 12, 80339 München;info@mueller.de;rechnungen@mueller.de;+49 89 123;Stefan Müller;DE;30;5;2;10\r\n');
});
router.post('/import', upload.single('file'), (req, res) => {
  const what = req.body.what; const result = { created: 0, skipped: 0, errors: [] };
  try {
    if (!req.file) throw new Error('Vyberte súbor CSV.');
    const { headers, rows } = parseCsv(req.file.buffer.toString('utf8'));
    if (!rows.length) throw new Error('Súbor neobsahuje žiadne riadky.');
    for (const r of rows) {
      try {
        if (what === 'workers') {
          const fn = pick(r, WORKER_COLS.first_name), ln = pick(r, WORKER_COLS.last_name);
          if (!fn || !ln) { result.skipped++; continue; }
          if (get('SELECT id FROM workers WHERE first_name = ? AND last_name = ?', [fn, ln])) { result.skipped++; continue; }
          run('INSERT INTO workers(first_name, last_name, nationality, position, phone, email, hourly_cost, wage_rate, hourly_rate, birth_date, iban, address, id_number, lohngruppe, german_level, active, per_diem) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1)',
            [fn, ln, pick(r, WORKER_COLS.nationality), pick(r, WORKER_COLS.position), pick(r, WORKER_COLS.phone), pick(r, WORKER_COLS.email), U.num(pick(r, WORKER_COLS.hourly_cost)), U.num(pick(r, WORKER_COLS.wage_rate)) || null, U.num(pick(r, WORKER_COLS.hourly_rate)) || null, pick(r, WORKER_COLS.birth_date) || null, pick(r, WORKER_COLS.iban), pick(r, WORKER_COLS.address), pick(r, WORKER_COLS.id_number), pick(r, WORKER_COLS.lohngruppe), pick(r, WORKER_COLS.german_level)]);
        } else {
          const name = pick(r, CLIENT_COLS.name); if (!name) { result.skipped++; continue; }
          if (get('SELECT id FROM clients WHERE name = ?', [name])) { result.skipped++; continue; }
          const country = (pick(r, CLIENT_COLS.country) || 'SK').toUpperCase().slice(0, 2);
          run('INSERT INTO clients(name, ico, dic, ic_dph, address, email, invoice_email, phone, contact_person, country, due_days, retention_percent, skonto_percent, skonto_days, vat_mode, language, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)',
            [name, pick(r, CLIENT_COLS.ico), pick(r, CLIENT_COLS.dic), pick(r, CLIENT_COLS.ic_dph), pick(r, CLIENT_COLS.address), pick(r, CLIENT_COLS.email), pick(r, CLIENT_COLS.invoice_email), pick(r, CLIENT_COLS.phone), pick(r, CLIENT_COLS.contact_person), country, parseInt(pick(r, CLIENT_COLS.due_days), 10) || 14, U.num(pick(r, CLIENT_COLS.retention_percent)), U.num(pick(r, CLIENT_COLS.skonto_percent)), parseInt(pick(r, CLIENT_COLS.skonto_days), 10) || 0, country === 'SK' ? 'standard' : 'eu_reverse', country === 'DE' || country === 'AT' ? 'de' : 'sk']);
        }
        result.created++;
      } catch (e) { result.errors.push(e.message); }
    }
    log('import', `Import ${what}: ${result.created} nových, ${result.skipped} preskočených`);
  } catch (e) { result.errors.push(e.message); }
  res.render('settings/import', { title: 'Import dát', result, what });
});
// ---- vymazanie všetkých dát (začiatok ostrej prevádzky) ----
router.post('/reset-data', (req, res) => {
  if (req.body.confirm !== 'VYMAZAT') { req.flash('err', 'Pre vymazanie napíšte do poľa presne VYMAZAT.'); return res.redirect('/settings?tab=backup'); }
  const b = backupDatabase('before-reset');
  const { transaction } = require('../db');
  transaction(() => {
    for (const t of ['task_comments', 'tasks', 'reminders', 'payments', 'bank_transactions', 'bank_imports', 'invoice_fees', 'invoice_items', 'invoices', 'quote_items', 'quotes', 'timesheet_rows', 'timesheets', 'assignments', 'postings', 'worker_documents', 'worker_transactions', 'settlements', 'expenses', 'client_rates', 'contracts', 'sites', 'clients', 'workers', 'attachments', 'activity_log']) run(`DELETE FROM ${t}`);
    run("DELETE FROM users WHERE id != ? AND username IN ('kancelaria','dispecer','uctovnik') AND email LIKE '%@sxworkforce.sk'", [req.session.user.id]);
    run("DELETE FROM sqlite_sequence WHERE name NOT IN ('users','settings')");
    setSetting('demo_data', '0');
  });
  log('reset', 'Vymazané všetky dáta (začiatok ostrej prevádzky), záloha: ' + (b ? require('path').basename(b) : 'zlyhala'));
  req.flash('ok', 'Všetky dáta boli vymazané (používatelia a nastavenia ostali). Záloha pred vymazaním: ' + (b ? require('path').basename(b) : 'zlyhala'));
  res.redirect('/settings?tab=backup');
});
router.post('/backup-now', (req, res) => { const b = backupDatabase('manual'); req.flash(b ? 'ok' : 'err', b ? 'Záloha vytvorená: ' + require('path').basename(b) : 'Záloha zlyhala.'); res.redirect('/settings?tab=backup'); });
router.get('/backup/download', (req, res) => {
  const fs = require('fs'); const path = require('path'); const { DB_PATH } = require('../db');
  const dir = path.join(path.dirname(DB_PATH), 'backups'); const name = String(req.query.name || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const file = name ? path.join(dir, name) : null;
  if (file && fs.existsSync(file)) return res.download(file);
  const b = backupDatabase('download'); if (!b) return res.status(500).send('Záloha zlyhala'); res.download(b);
});
module.exports = router;
