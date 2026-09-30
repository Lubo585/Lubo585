// Odosielanie e-mailov cez SMTP (nodemailer)
const nodemailer = require('nodemailer');
const { getSettings } = require('../db');

function getTransport() {
  const s = getSettings();
  if (!s.smtp_host) throw new Error('SMTP server nie je nastavený (Nastavenia → E-mail).');
  return nodemailer.createTransport({
    host: s.smtp_host,
    port: Number(s.smtp_port) || 587,
    secure: s.smtp_secure === '1',
    auth: s.smtp_user ? { user: s.smtp_user, pass: s.smtp_pass } : undefined,
  });
}
async function sendMail({ to, cc, subject, text, html, attachments }) {
  const s = getSettings();
  const t = getTransport();
  return t.sendMail({ from: s.smtp_from || s.smtp_user, to, cc: cc || undefined, subject, text, html, attachments });
}
async function testConnection() { const t = getTransport(); await t.verify(); return true; }

module.exports = { sendMail, testConnection };
