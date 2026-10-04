// Prílohy (súbory) k záznamom: faktúry, pracovníci, klienti, zákazky, úlohy, lístky, doklady
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { all, get, run, DB_PATH } = require('../db');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(path.dirname(DB_PATH), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED = /\.(pdf|png|jpe?g|gif|webp|heic|doc|docx|xls|xlsx|csv|txt|xml|zip|odt|ods)$/i;

function save({ entityType, entityId, buffer, filename, mime, userId, kind = 'file', note = '' }) {
  if (!ALLOWED.test(filename)) throw new Error('Nepovolený typ súboru: ' + filename);
  const ext = path.extname(filename).toLowerCase();
  const stored = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), buffer);
  const r = run('INSERT INTO attachments(entity_type, entity_id, kind, filename, stored_name, mime, size, uploaded_by, note) VALUES (?,?,?,?,?,?,?,?,?)', [entityType, entityId, kind, filename, stored, mime || '', buffer.length, userId || null, note]);
  return Number(r.lastInsertRowid);
}
function list(entityType, entityId) { return all('SELECT a.*, u.name AS user_name FROM attachments a LEFT JOIN users u ON u.id=a.uploaded_by WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.id DESC', [entityType, entityId]); }
function find(id) { return get('SELECT * FROM attachments WHERE id = ?', [id]); }
function filePath(att) { return path.join(UPLOAD_DIR, att.stored_name); }
function remove(id) {
  const a = find(id); if (!a) return;
  try { fs.unlinkSync(filePath(a)); } catch (_) { /* ignore */ }
  run('DELETE FROM attachments WHERE id = ?', [id]);
}
module.exports = { save, list, find, filePath, remove, UPLOAD_DIR };
