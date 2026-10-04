// Parsovanie bankových výpisov: camt.053 / camt.054 XML (SEPA), CSV exporty bánk, jednoduchý text
const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');
const U = require('../utils');

function normalizeDate(s) {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function parseAmount(s) {
  if (s === undefined || s === null) return NaN;
  let t = String(s).trim().replace(/\s/g, '').replace(/[€]/g, '');
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  return parseFloat(t);
}
function extractSymbols(text) {
  const out = { vs: null, ss: null, ks: null };
  if (!text) return out;
  const t = String(text);
  let m = t.match(/\/?VS\s*[:=\/]?\s*(\d{1,10})/i); if (m) out.vs = m[1];
  m = t.match(/\/?SS\s*[:=\/]?\s*(\d{1,10})/i); if (m) out.ss = m[1];
  m = t.match(/\/?KS\s*[:=\/]?\s*(\d{1,4})/i); if (m) out.ks = m[1];
  return out;
}
function txHash(t) {
  return crypto.createHash('sha1').update([t.date, t.amount.toFixed(2), t.currency, t.counterparty_iban || '', t.variable_symbol || '', t.bank_reference || '', (t.message || '').slice(0, 60)].join('|')).digest('hex');
}
function finalize(t) {
  t.amount = U.round2(t.amount);
  t.currency = t.currency || 'EUR';
  if (!t.variable_symbol) {
    const s = extractSymbols(t.message);
    t.variable_symbol = s.vs; t.specific_symbol = t.specific_symbol || s.ss; t.constant_symbol = t.constant_symbol || s.ks;
  }
  if (t.variable_symbol) t.variable_symbol = String(t.variable_symbol).replace(/\D/g, '').replace(/^0+(?=\d)/, '') || null;
  t.hash = txHash(t);
  return t;
}
const asArray = (x) => (x === undefined || x === null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x === undefined || x === null ? '' : typeof x === 'object' ? (x['#text'] ?? '') : String(x));

// ---- camt.053 / camt.054 ----
function parseCamt(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true });
  const doc = parser.parse(xml);
  const root = doc.Document || doc;
  const stmts = asArray(root.BkToCstmrStmt?.Stmt).concat(asArray(root.BkToCstmrDbtCdtNtfctn?.Ntfctn));
  const out = [];
  for (const st of stmts) {
    for (const e of asArray(st.Ntry)) {
      const sign = txt(e.CdtDbtInd) === 'DBIT' ? -1 : 1;
      const amt = e.Amt || {};
      const amount = sign * parseAmount(txt(amt));
      const currency = amt['@_Ccy'] || 'EUR';
      const date = normalizeDate(txt(e.BookgDt?.Dt) || txt(e.ValDt?.Dt) || txt(e.BookgDt?.DtTm));
      const details = asArray(e.NtryDtls).flatMap((d) => asArray(d.TxDtls));
      const base = { date, currency, bank_reference: txt(e.AcctSvcrRef) || txt(e.NtryRef) || null };
      if (!details.length) {
        out.push(finalize({ ...base, amount, message: txt(e.AddtlNtryInf), counterparty_name: null, counterparty_iban: null }));
        continue;
      }
      for (const d of details) {
        const parties = d.RltdPties || {};
        const isCredit = sign > 0;
        const party = isCredit ? (parties.Dbtr?.Pty || parties.Dbtr) : (parties.Cdtr?.Pty || parties.Cdtr);
        const acct = isCredit ? parties.DbtrAcct : parties.CdtrAcct;
        const rmt = d.RmtInf || {};
        const ustrd = asArray(rmt.Ustrd).map(txt).join(' ');
        let vs = null, ss = null, ks = null;
        for (const s of asArray(rmt.Strd)) {
          const ref = txt(s.CdtrRefInf?.Ref);
          const sym = extractSymbols(ref);
          vs = vs || sym.vs; ss = ss || sym.ss; ks = ks || sym.ks;
          if (!vs && /^\d{1,10}$/.test(ref)) vs = ref;
          for (const a of asArray(s.AddtlRmtInf)) { const s2 = extractSymbols(txt(a)); vs = vs || s2.vs; ss = ss || s2.ss; ks = ks || s2.ks; }
        }
        const refs = d.Refs || {};
        const e2e = txt(refs.EndToEndId);
        if (!vs) { const s3 = extractSymbols(e2e + ' ' + ustrd + ' ' + txt(e.AddtlNtryInf)); vs = s3.vs; ss = ss || s3.ss; ks = ks || s3.ks; }
        const txAmt = d.Amt ? sign * parseAmount(txt(d.Amt)) : amount;
        out.push(finalize({
          ...base, amount: details.length > 1 ? txAmt : amount,
          counterparty_name: txt(party?.Nm) || null,
          counterparty_iban: txt(acct?.Id?.IBAN) || null,
          variable_symbol: vs, specific_symbol: ss, constant_symbol: ks,
          message: [ustrd, txt(e.AddtlNtryInf)].filter(Boolean).join(' | ') || null,
          bank_reference: base.bank_reference || txt(refs.AcctSvcrRef) || e2e || null,
        }));
      }
    }
  }
  return out;
}

// ---- CSV ----
function detectDelimiter(line) {
  const c = { ';': (line.match(/;/g) || []).length, ',': (line.match(/,/g) || []).length, '\t': (line.match(/\t/g) || []).length, '|': (line.match(/\|/g) || []).length };
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}
function parseCsvLine(line, delim) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const COLS = {
  date: ['datum', 'datumzauctovania', 'datumuctovania', 'datumtransakcie', 'datumvaluty', 'datumsplatnosti', 'bookingdate', 'date', 'valuta', 'datumzuctovania', 'datumpohybu'],
  amount: ['suma', 'objem', 'ciastka', 'amount', 'sumavmene', 'sumavmeneuctu', 'sumatransakcie', 'hodnota', 'castka'],
  credit: ['kredit', 'prijem', 'credit', 'prijemsuma', 'sumakredit'],
  debit: ['debet', 'vydaj', 'debit', 'vydajsuma', 'sumadebet'],
  currency: ['mena', 'currency', 'menauctu', 'menatransakcie'],
  vs: ['vs', 'variabilnysymbol', 'variabilny', 'variablesymbol', 'variabilnisymbol'],
  ss: ['ss', 'specifickysymbol', 'specificsymbol'],
  ks: ['ks', 'konstantnysymbol', 'constantsymbol'],
  name: ['nazovprotiuctu', 'protistrana', 'nazovprotistrany', 'menoprotiuctu', 'partner', 'counterparty', 'nazovpartnera', 'platitel', 'prikazca', 'menoplatitela', 'nazovuctuprotistrany', 'popisprotiuctu'],
  iban: ['ibanprotiuctu', 'protiucet', 'protiucetiban', 'ucetprotistrany', 'iban', 'cislouctuprotistrany', 'cisloprotiuctu'],
  message: ['spravapreprijemcu', 'sprava', 'popis', 'poznamka', 'referencia', 'informaciapreprijemcu', 'description', 'message', 'poznamkaprijemcu', 'detailtransakcie', 'ucelplatby', 'popistransakcie'],
  ref: ['idpohybu', 'idtransakcie', 'referenciaplatby', 'reference', 'cislotransakcie', 'idoperacie'],
};
function findCol(headers, keys) {
  const h = headers.map(norm);
  for (const k of keys) { const i = h.indexOf(k); if (i >= 0) return i; }
  for (const k of keys) { const i = h.findIndex((x) => x.startsWith(k) && k.length >= 4); if (i >= 0) return i; }
  return -1;
}
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  // hľadaj hlavičku: riadok, ktorý obsahuje "datum" aj niečo ako suma/objem
  let hi = lines.findIndex((l) => /dat/i.test(norm(l)) && /(suma|objem|ciastka|amount|castka|kredit|prijem)/.test(norm(l)));
  if (hi < 0) hi = 0;
  const delim = detectDelimiter(lines[hi]);
  const headers = parseCsvLine(lines[hi], delim);
  const c = {}; for (const k of Object.keys(COLS)) c[k] = findCol(headers, COLS[k]);
  if (c.date < 0 || (c.amount < 0 && c.credit < 0)) throw new Error('CSV: nenašiel som stĺpce s dátumom a sumou. Hlavička: ' + headers.join(' | '));
  const out = [];
  for (let i = hi + 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i], delim);
    if (f.length < 2) continue;
    const date = normalizeDate(f[c.date]);
    if (!date) continue;
    let amount;
    if (c.amount >= 0 && f[c.amount] !== '') amount = parseAmount(f[c.amount]);
    else {
      const cr = c.credit >= 0 ? parseAmount(f[c.credit]) : NaN;
      const db = c.debit >= 0 ? parseAmount(f[c.debit]) : NaN;
      amount = !isNaN(cr) && cr !== 0 ? Math.abs(cr) : (!isNaN(db) ? -Math.abs(db) : NaN);
    }
    if (isNaN(amount)) continue;
    const g = (k) => (c[k] >= 0 ? f[c[k]] || null : null);
    out.push(finalize({
      date, amount, currency: g('currency') || 'EUR',
      counterparty_name: g('name'), counterparty_iban: g('iban'),
      variable_symbol: g('vs'), specific_symbol: g('ss'), constant_symbol: g('ks'),
      message: g('message'), bank_reference: g('ref'),
    }));
  }
  return out;
}

// ---- MT940 (SWIFT) ----
function parseMt940(text) {
  const out = []; const lines = text.split(/\r?\n/);
  let cur = null; let info = '';
  const flush = () => { if (!cur) return; const sym = extractSymbols(info); const nameMatch = info.match(/\?32([^?]*)/); const ibanMatch = info.match(/\?38([^?]*)/) || info.match(/([A-Z]{2}\d{2}[A-Z0-9]{11,30})/); const msg = (info.match(/\?2[0-9]([^?]*)/g) || []).map((m) => m.slice(3)).join(' ').trim(); out.push(finalize({ ...cur, counterparty_name: nameMatch ? nameMatch[1].trim() : null, counterparty_iban: ibanMatch ? ibanMatch[1].trim() : null, variable_symbol: sym.vs, specific_symbol: sym.ss, constant_symbol: sym.ks, message: msg || info.replace(/\?\d\d/g, ' ').trim() })); cur = null; info = ''; };
  for (const raw of lines) {
    const line = raw.trim(); if (!line) continue;
    if (line.startsWith(':61:')) { flush(); const m = line.slice(4).match(/^(\d{6})(\d{4})?([CD])R?([A-Z])?([\d,]+)/); if (!m) continue; const y = '20' + m[1].slice(0, 2); cur = { date: `${y}-${m[1].slice(2, 4)}-${m[1].slice(4, 6)}`, amount: (m[3] === 'D' ? -1 : 1) * parseAmount(m[5]), currency: 'EUR', bank_reference: line.slice(4).split('//')[1] || null }; }
    else if (line.startsWith(':86:')) info += line.slice(4) + ' ';
    else if (cur && !line.startsWith(':')) info += line + ' ';
    else if (line.startsWith(':60') || line.startsWith(':62')) flush();
  }
  flush(); return out;
}

// Automatická detekcia formátu
function parseStatement(buffer, filename = '') {
  const text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  const head = text.slice(0, 500);
  if (/<\?xml|<Document/i.test(head) || /\.xml$/i.test(filename)) return { format: 'camt', transactions: parseCamt(text) };
  if (/^:20:|\n:61:/m.test(text) || /\.(sta|mt940|940)$/i.test(filename)) return { format: 'mt940', transactions: parseMt940(text) };
  if (/\.(csv|txt|tsv)$/i.test(filename) || /[;,\t]/.test(head)) return { format: 'csv', transactions: parseCsv(text) };
  throw new Error('Neznámy formát výpisu (podporované: camt.053/054 XML, CSV)');
}

module.exports = { parseStatement, parseCamt, parseCsv, parseMt940, extractSymbols, normalizeDate, parseAmount };
