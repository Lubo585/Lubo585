// Databázová vrstva – SQLite cez vstavaný modul node:sqlite (Node >= 22.5)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nationality TEXT,
  position TEXT,
  phone TEXT,
  email TEXT,
  hourly_cost REAL DEFAULT 0,      -- nákladová hodinová sadzba (mzda + odvody)
  hourly_rate REAL,                -- voliteľná fakturačná sadzba pracovníka (prebíja sadzbu stavby)
  active INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ico TEXT,
  dic TEXT,
  ic_dph TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  contact_person TEXT,
  due_days INTEGER DEFAULT 14,
  retention_percent REAL DEFAULT 0,
  retention_months INTEGER DEFAULT 0,
  skonto_percent REAL DEFAULT 0,
  skonto_days INTEGER DEFAULT 0,
  reverse_charge INTEGER DEFAULT 0,
  note TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  address TEXT,
  hourly_rate REAL DEFAULT 0,      -- fakturačná sadzba za hodinu pracovníka
  overtime_rate REAL,              -- voliteľná sadzba za nadčasy
  active INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  week_start TEXT NOT NULL,        -- pondelok ISO týždňa (YYYY-MM-DD)
  status TEXT DEFAULT 'draft',     -- draft | approved | invoiced
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, week_start)
);

CREATE TABLE IF NOT EXISTS timesheet_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  d1 REAL DEFAULT 0, d2 REAL DEFAULT 0, d3 REAL DEFAULT 0, d4 REAL DEFAULT 0,
  d5 REAL DEFAULT 0, d6 REAL DEFAULT 0, d7 REAL DEFAULT 0,
  rate_override REAL,
  note TEXT,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  supplier TEXT,
  amount_net REAL NOT NULL DEFAULT 0,
  vat_rate REAL DEFAULT 0,
  amount_total REAL NOT NULL DEFAULT 0,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  recurring INTEGER DEFAULT 0,
  paid INTEGER DEFAULT 1,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT UNIQUE NOT NULL,
  variable_symbol TEXT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  issue_date TEXT NOT NULL,
  delivery_date TEXT,
  due_date TEXT NOT NULL,
  period_from TEXT,
  period_to TEXT,
  currency TEXT DEFAULT 'EUR',
  subtotal REAL DEFAULT 0,
  vat_rate REAL DEFAULT 23,
  vat_amount REAL DEFAULT 0,
  total REAL DEFAULT 0,
  reverse_charge INTEGER DEFAULT 0,
  fees_total REAL DEFAULT 0,
  retention_percent REAL DEFAULT 0,
  retention_amount REAL DEFAULT 0,
  retention_due_date TEXT,
  retention_paid REAL DEFAULT 0,
  skonto_percent REAL DEFAULT 0,
  skonto_days INTEGER DEFAULT 0,
  skonto_applied INTEGER DEFAULT 0,
  skonto_amount REAL DEFAULT 0,
  amount_due REAL DEFAULT 0,       -- total + fees_total - retention_amount
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'issued',    -- draft | issued | partial | paid | cancelled
  paid_date TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit TEXT DEFAULT 'hod',
  unit_price REAL DEFAULT 0,
  total REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoice_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0   -- kladné = poplatok navyše, záporné = zrážka
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT DEFAULT 'payment',     -- payment | retention | skonto
  bank_transaction_id INTEGER REFERENCES bank_transactions(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bank_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  source TEXT,                     -- email | upload
  email_subject TEXT,
  email_from TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  transactions_count INTEGER DEFAULT 0,
  new_count INTEGER DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hash TEXT UNIQUE NOT NULL,
  import_id INTEGER REFERENCES bank_imports(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'EUR',
  counterparty_name TEXT,
  counterparty_iban TEXT,
  variable_symbol TEXT,
  specific_symbol TEXT,
  constant_symbol TEXT,
  message TEXT,
  bank_reference TEXT,
  matched_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  match_status TEXT DEFAULT 'unmatched',  -- unmatched | auto | manual | ignored
  match_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  to_email TEXT,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'sent',      -- sent | failed | manual
  error TEXT,
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'new',       -- new | progress | waiting | done | cancelled
  priority TEXT DEFAULT 'normal',  -- low | normal | high
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  due_date TEXT,
  done_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'comment',     -- comment | status | assign
  text TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_tx_vs ON bank_transactions(variable_symbol);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start);
`;

db.exec(SCHEMA);

// ---------- migrácie (doplnenie stĺpcov do existujúcich databáz) ----------
function addColumn(table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}
addColumn('sites', 'status', "TEXT DEFAULT 'open'");          // open (voľná) | active (rozpracovaná) | finished (ukončená)
addColumn('sites', 'start_date', 'TEXT');
addColumn('sites', 'end_date', 'TEXT');
addColumn('sites', 'workers_needed', 'INTEGER DEFAULT 0');
addColumn('sites', 'description', 'TEXT');
addColumn('sites', 'contact_person', 'TEXT');
addColumn('sites', 'contact_phone', 'TEXT');
db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");

// ---------- pomocné funkcie ----------
// undefined sa nedá naviazať ako parameter, prevedie sa na NULL
const bind = (params) => params.map((p) => (p === undefined ? null : p));
function all(sql, params = []) { return db.prepare(sql).all(...bind(params)); }
function get(sql, params = []) { return db.prepare(sql).get(...bind(params)); }
function run(sql, params = []) { return db.prepare(sql).run(...bind(params)); }
let txDepth = 0;
// Transakcia s podporou vnorenia (vnorené volania používajú SAVEPOINT)
function transaction(fn) {
  const name = 'sp' + txDepth;
  db.exec(txDepth === 0 ? 'BEGIN' : `SAVEPOINT ${name}`);
  txDepth++;
  try {
    const r = fn();
    txDepth--;
    db.exec(txDepth === 0 ? 'COMMIT' : `RELEASE SAVEPOINT ${name}`);
    return r;
  } catch (e) {
    txDepth--;
    db.exec(txDepth === 0 ? 'ROLLBACK' : `ROLLBACK TO SAVEPOINT ${name}; RELEASE SAVEPOINT ${name}`);
    throw e;
  }
}

// ---------- nastavenia ----------
const DEFAULT_SETTINGS = {
  company_name: 'SX Workforce s.r.o.',
  company_address: 'Doležalova 15C, 821 04 Bratislava - mestská časť Ružinov',
  company_ico: '55087019',
  company_dic: '2121883632',
  company_ic_dph: 'SK2121883632',
  company_iban: '',
  company_bic: '',
  company_email: '',
  company_phone: '',
  company_register: '',
  invoice_prefix: '',            // napr. FA
  invoice_number_format: '{YYYY}{NNNN}', // {YYYY}, {YY}, {NNNN}, {NNN}
  default_vat_rate: '23',
  default_due_days: '14',
  default_hourly_rate: '0',
  reminder_enabled: '0',
  reminder_days: '3,14,30',
  reminder_subject: 'Upomienka č. {LEVEL} – faktúra {NUMBER} po splatnosti',
  reminder_body: 'Dobrý deň,\n\ndovoľujeme si Vás upozorniť, že faktúra č. {NUMBER} vystavená dňa {ISSUE_DATE} so splatnosťou {DUE_DATE} na sumu {AMOUNT} EUR nebola k dnešnému dňu uhradená. Faktúra je {DAYS_OVERDUE} dní po splatnosti.\n\nNeuhradená suma: {REMAINING} EUR\nVariabilný symbol: {VS}\nIBAN: {IBAN}\n\nAk ste úhradu už zrealizovali, považujte túto správu za bezpredmetnú.\n\nS pozdravom\n{COMPANY}',
  reminder_cc: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: '0',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  imap_enabled: '0',
  imap_host: '',
  imap_port: '993',
  imap_secure: '1',
  imap_user: '',
  imap_pass: '',
  imap_folder: 'INBOX',
  imap_from_filter: '',           // voliteľne: iba e-maily od tejto adresy/domény
  imap_interval_minutes: '15',
  imap_last_check: '',
  imap_last_error: '',
  match_amount_tolerance: '0.02',
  ai_api_key: '',
  ai_model: 'claude-opus-5-5',
};

function getSetting(key) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : (DEFAULT_SETTINGS[key] ?? '');
}
function getSettings() {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of all('SELECT key, value FROM settings')) out[r.key] = r.value;
  return out;
}
function setSetting(key, value) {
  run('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value ?? '']);
}

// ---------- heslá ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

// prvý používateľ
if (!get('SELECT id FROM users LIMIT 1')) {
  const pw = process.env.ADMIN_PASSWORD || 'admin';
  run('INSERT INTO users(username, password_hash, name, role) VALUES (?, ?, ?, ?)', ['admin', hashPassword(pw), 'Administrátor', 'admin']);
  console.log('Vytvorený prvý používateľ: admin / ' + pw + ' (zmeňte heslo v Nastaveniach)');
}

function log(type, message) {
  run('INSERT INTO activity_log(type, message) VALUES (?, ?)', [type, message]);
}

module.exports = { db, all, get, run, transaction, getSetting, getSettings, setSetting, hashPassword, verifyPassword, log, DEFAULT_SETTINGS };
