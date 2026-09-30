// Sťahovanie bankových výpisov z e-mailovej schránky (IMAP) a ich import
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { getSettings, setSetting, log, run } = require('../db');
const { importStatementFile } = require('./matching');

let running = false;

async function checkMailbox() {
  const s = getSettings();
  if (s.imap_enabled !== '1' || !s.imap_host) return { skipped: true };
  if (running) return { skipped: true, reason: 'beží' };
  running = true;
  const client = new ImapFlow({
    host: s.imap_host, port: Number(s.imap_port) || 993, secure: s.imap_secure !== '0',
    auth: { user: s.imap_user, pass: s.imap_pass }, logger: false,
  });
  const result = { messages: 0, imported: 0, created: 0, matched: 0, errors: [] };
  try {
    await client.connect();
    const lock = await client.getMailboxLock(s.imap_folder || 'INBOX');
    try {
      const uids = await client.search({ seen: false });
      for (const uid of uids || []) {
        const msg = await client.fetchOne(uid, { source: true, uid: true });
        if (!msg || !msg.source) continue;
        const mail = await simpleParser(msg.source);
        const from = (mail.from && mail.from.text) || '';
        if (s.imap_from_filter && !from.toLowerCase().includes(s.imap_from_filter.toLowerCase())) continue;
        result.messages++;
        let any = false;
        for (const att of mail.attachments || []) {
          const name = att.filename || 'priloha';
          if (!/\.(xml|csv|txt|tsv)$/i.test(name)) continue;
          try {
            const r = importStatementFile(att.content, name, { source: 'email', subject: mail.subject, from });
            result.imported++; result.created += r.created; result.matched += r.matched; any = true;
          } catch (e) {
            result.errors.push(`${name}: ${e.message}`);
            run('INSERT INTO bank_imports(filename, source, email_subject, email_from, error) VALUES (?,?,?,?,?)', [name, 'email', mail.subject, from, e.message]);
          }
        }
        // výpis priamo v tele e-mailu (CSV/XML ako text)
        if (!any && mail.text && /<Document|;.*;.*;/.test(mail.text)) {
          try {
            const r = importStatementFile(mail.text, 'email-body.txt', { source: 'email', subject: mail.subject, from });
            result.imported++; result.created += r.created; result.matched += r.matched; any = true;
          } catch (e) { /* telo nie je výpis */ }
        }
        await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
      }
    } finally { lock.release(); }
    await client.logout();
    setSetting('imap_last_check', new Date().toISOString());
    setSetting('imap_last_error', result.errors.join('; '));
    if (result.messages) log('imap', `Kontrola schránky: ${result.messages} e-mailov, ${result.imported} výpisov, ${result.created} nových transakcií, ${result.matched} spárovaných`);
  } catch (e) {
    setSetting('imap_last_check', new Date().toISOString());
    setSetting('imap_last_error', e.message);
    log('error', 'IMAP: ' + e.message);
    result.errors.push(e.message);
    try { await client.logout(); } catch (_) { /* ignore */ }
  } finally { running = false; }
  return result;
}

async function testConnection() {
  const s = getSettings();
  const client = new ImapFlow({ host: s.imap_host, port: Number(s.imap_port) || 993, secure: s.imap_secure !== '0', auth: { user: s.imap_user, pass: s.imap_pass }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock(s.imap_folder || 'INBOX');
  const count = client.mailbox.exists;
  lock.release();
  await client.logout();
  return count;
}

module.exports = { checkMailbox, testConnection };
