// Automatické upomienky pre faktúry po splatnosti
const { all, get, run, getSettings, log } = require('../db');
const U = require('../utils');
const INV = require('./invoices');
const { sendMail } = require('./mailer');

function fill(tpl, vars) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)); }

function buildReminder(inv, level) {
  const s = getSettings();
  const client = get('SELECT * FROM clients WHERE id = ?', [inv.client_id]);
  const vars = {
    LEVEL: level, NUMBER: inv.number, VS: inv.variable_symbol || inv.number, ISSUE_DATE: U.fmtDate(inv.issue_date), DUE_DATE: U.fmtDate(inv.due_date),
    AMOUNT: U.money(inv.amount_due, ''), REMAINING: U.money(INV.remaining(inv), ''), DAYS_OVERDUE: INV.daysOverdue(inv),
    IBAN: s.company_iban, COMPANY: s.company_name, CLIENT: client ? client.name : '',
  };
  return { to: client ? client.email : '', subject: fill(s.reminder_subject, vars), body: fill(s.reminder_body, vars), client };
}

// Faktúry, ktorým dnes prislúcha upomienka daného stupňa
function dueReminders() {
  const s = getSettings();
  const days = String(s.reminder_days || '').split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  const out = [];
  const invoices = all("SELECT * FROM invoices WHERE status IN ('issued','partial') AND due_date < ?", [U.today()]);
  for (const inv of invoices) {
    const overdue = INV.daysOverdue(inv);
    const sent = all("SELECT level FROM reminders WHERE invoice_id = ? AND status IN ('sent','manual')", [inv.id]).map((r) => r.level);
    // najvyšší stupeň, ktorý už mal byť odoslaný
    let level = 0;
    days.forEach((d, i) => { if (overdue >= d) level = i + 1; });
    if (level > 0 && !sent.includes(level)) out.push({ invoice: inv, level });
  }
  return out;
}

async function sendReminder(invoiceId, level, manual = false) {
  const inv = get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  if (!inv) throw new Error('Faktúra neexistuje');
  const r = buildReminder(inv, level);
  const s = getSettings();
  if (!r.to) {
    run('INSERT INTO reminders(invoice_id, level, to_email, subject, body, status, error) VALUES (?,?,?,?,?,?,?)', [invoiceId, level, '', r.subject, r.body, 'failed', 'Klient nemá e-mail']);
    throw new Error(`Klient faktúry ${inv.number} nemá e-mailovú adresu.`);
  }
  try {
    await sendMail({ to: r.to, cc: s.reminder_cc || undefined, subject: r.subject, text: r.body });
    run('INSERT INTO reminders(invoice_id, level, to_email, subject, body, status) VALUES (?,?,?,?,?,?)', [invoiceId, level, r.to, r.subject, r.body, manual ? 'manual' : 'sent']);
    log('reminder', `Odoslaná upomienka č. ${level} pre faktúru ${inv.number} na ${r.to}`);
    return true;
  } catch (e) {
    run('INSERT INTO reminders(invoice_id, level, to_email, subject, body, status, error) VALUES (?,?,?,?,?,?,?)', [invoiceId, level, r.to, r.subject, r.body, 'failed', e.message]);
    log('error', `Upomienka pre ${inv.number} zlyhala: ${e.message}`);
    throw e;
  }
}

// Denný beh: odošle všetky upomienky, ktoré sú na rade
async function runDaily() {
  const s = getSettings();
  if (s.reminder_enabled !== '1') return { skipped: true };
  const due = dueReminders();
  let sent = 0, failed = 0;
  for (const d of due) {
    try { await sendReminder(d.invoice.id, d.level); sent++; } catch (e) { failed++; }
  }
  if (due.length) log('reminder', `Automatické upomienky: ${sent} odoslaných, ${failed} zlyhaných`);
  return { sent, failed };
}

module.exports = { buildReminder, dueReminders, sendReminder, runDaily };
