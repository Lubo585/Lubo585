// Ukladanie prihlásení do SQLite, aby prihlásenie prežilo reštart servera
const session = require('express-session');
const { db } = require('./db');

class SqliteStore extends session.Store {
  constructor() {
    super();
    this.get_ = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.set_ = db.prepare('INSERT INTO sessions(sid, data, expires) VALUES (?,?,?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires');
    this.del_ = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touch_ = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
    this.clean_ = db.prepare('DELETE FROM sessions WHERE expires < ?');
    setInterval(() => { try { this.clean_.run(Date.now()); } catch (_) { /* ignore */ } }, 15 * 60 * 1000).unref();
  }
  expiry(sess) { return sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 12 * 3600 * 1000; }
  get(sid, cb) {
    try { const r = this.get_.get(sid); if (!r || r.expires < Date.now()) return cb(null, null); cb(null, JSON.parse(r.data)); } catch (e) { cb(e); }
  }
  set(sid, sess, cb) { try { this.set_.run(sid, JSON.stringify(sess), this.expiry(sess)); cb && cb(null); } catch (e) { cb && cb(e); } }
  destroy(sid, cb) { try { this.del_.run(sid); cb && cb(null); } catch (e) { cb && cb(e); } }
  touch(sid, sess, cb) { try { this.touch_.run(this.expiry(sess), sid); cb && cb(null); } catch (e) { cb && cb(e); } }
}
module.exports = SqliteStore;
