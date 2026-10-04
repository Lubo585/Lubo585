// Automatické testy: spustite `npm test`
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'test-' + process.pid + '.db');
process.env.DB_PATH = dbPath;
const { run, get, all } = require('../src/db');
const U = require('../src/utils');
const INV = require('../src/services/invoices');
const M = require('../src/services/matching');
const P = require('../src/services/bankparser');
const R = require('../src/services/reminders');

test.after(() => { for (const f of [dbPath, dbPath + '-wal', dbPath + '-shm']) { try { fs.unlinkSync(f); } catch (_) { /* */ } } });

test('utils: týždne a dátumy', () => {
  assert.equal(U.weekStart('2026-09-30'), '2026-09-28');
  assert.equal(U.weekStart('2026-09-28'), '2026-09-28');
  assert.deepEqual(U.isoWeek('2026-01-01'), { week: 1, year: 2026 });
  assert.equal(U.addMonths('2026-01-31', 1), '2026-03-03');
  assert.equal(U.monthEnd('2026-02-10'), '2026-02-28');
  assert.equal(U.num('1 234,50'), 1234.5);
});

test('bankparser: CSV a camt.053', () => {
  const csv = 'Dátum;Suma;Mena;Názov protiúčtu;VS;Správa pre prijímateľa\n15.03.2026;1 234,50;EUR;STAVBY s.r.o.;0020260001;Faktura\n16.03.2026;-50,00;EUR;Slovnaft;;PHM';
  const rows = P.parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 1234.5);
  assert.equal(rows[0].variable_symbol, '20260001');
  assert.equal(rows[1].amount, -50);
  const xml = '<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Ntry><Amt Ccy="EUR">500.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-03-17</Dt></BookgDt><NtryDtls><TxDtls><Refs><EndToEndId>/VS20260002/SS/KS0308</EndToEndId></Refs><RltdPties><Dbtr><Nm>BETON a.s.</Nm></Dbtr><DbtrAcct><Id><IBAN>SK1234</IBAN></Id></DbtrAcct></RltdPties><RmtInf><Ustrd>uhrada FA</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry></Stmt></BkToCstmrStmt></Document>';
  const tx = P.parseCamt(xml);
  assert.equal(tx.length, 1);
  assert.equal(tx[0].variable_symbol, '20260002');
  assert.equal(tx[0].counterparty_name, 'BETON a.s.');
  assert.equal(tx[0].constant_symbol, '0308');
  assert.equal(P.parseStatement(Buffer.from(xml), 'vypis.xml').format, 'camt');
  assert.equal(P.parseStatement(Buffer.from(csv), 'vypis.csv').format, 'csv');
});

test('faktúra: výpočet, skonto, zádržné a párovanie', () => {
  run("INSERT INTO clients(name, email) VALUES ('Klient s.r.o.', 'k@k.sk')");
  const c = get('SELECT id FROM clients ORDER BY id DESC LIMIT 1').id;
  const num = INV.nextInvoiceNumber('2026-05-01');
  assert.match(num, /^2026\d{4}$/);
  run("INSERT INTO invoices(number, variable_symbol, client_id, issue_date, due_date, vat_rate, retention_percent, skonto_percent, skonto_days, status) VALUES (?,?,?,?,?,23,10,2,7,'issued')", [num, num, c, '2026-05-01', '2026-05-15']);
  const id = get('SELECT id FROM invoices ORDER BY id DESC LIMIT 1').id;
  run("INSERT INTO invoice_items(invoice_id, description, quantity, unit_price) VALUES (?, 'hodiny', 100, 20)", [id]);
  run("INSERT INTO invoice_fees(invoice_id, name, amount) VALUES (?, 'poplatok', 40)", [id]);
  let inv = INV.recalc(id);
  assert.equal(inv.subtotal, 2000);
  assert.equal(inv.vat_amount, 460);
  assert.equal(inv.total, 2460);
  assert.equal(inv.retention_amount, 246);
  assert.equal(inv.amount_due, 2254);   // 2460 + 40 - 246
  assert.equal(inv.skonto_amount, 45.08);

  // platba so skontom v lehote -> uhradená
  const skontoPay = U.round2(inv.amount_due - inv.skonto_amount);
  const res = M.importTransactions([{ hash: 'h1', date: '2026-05-05', amount: skontoPay, currency: 'EUR', counterparty_name: 'Klient s.r.o.', variable_symbol: num }], { source: 'upload' });
  assert.equal(res.matched, 1);
  inv = get('SELECT * FROM invoices WHERE id = ?', [id]);
  assert.equal(inv.status, 'paid');
  assert.equal(inv.skonto_applied, 1);
  assert.equal(INV.remaining(inv), 0);
  assert.equal(INV.retentionRemaining(inv), 246);

  // vyplatenie zádržného
  const res2 = M.importTransactions([{ hash: 'h2', date: '2026-11-05', amount: 246, currency: 'EUR', counterparty_name: 'Klient', variable_symbol: num }], { source: 'upload' });
  assert.equal(res2.matched, 1);
  inv = get('SELECT * FROM invoices WHERE id = ?', [id]);
  assert.equal(inv.retention_paid, 246);
  const tx = get("SELECT * FROM bank_transactions WHERE hash = 'h2'");
  assert.equal(get('SELECT type FROM payments WHERE bank_transaction_id = ?', [tx.id]).type, 'retention');

  // duplicita sa neimportuje
  const res3 = M.importTransactions([{ hash: 'h2', date: '2026-11-05', amount: 246, currency: 'EUR', variable_symbol: num }], {});
  assert.equal(res3.created, 0);

  // odpárovanie vráti stav
  M.unmatchTransaction(tx.id);
  inv = get('SELECT * FROM invoices WHERE id = ?', [id]);
  assert.equal(inv.retention_paid, 0);
});

test('upomienky: výber stupňa podľa dní po splatnosti', () => {
  const c = get('SELECT id FROM clients LIMIT 1').id;
  const due = U.addDays(U.today(), -20);
  run("INSERT INTO invoices(number, variable_symbol, client_id, issue_date, due_date, amount_due, status) VALUES ('UP1','1',?,?,?,100,'issued')", [c, U.addDays(due, -14), due]);
  const id = get("SELECT id FROM invoices WHERE number = 'UP1'").id;
  const list = R.dueReminders().filter((d) => d.invoice.id === id);
  assert.equal(list.length, 1);
  assert.equal(list[0].level, 2); // 20 dní: stupne 3,14,30 -> 2. upomienka
  run("INSERT INTO reminders(invoice_id, level, status) VALUES (?, 2, 'sent')", [id]);
  assert.equal(R.dueReminders().filter((d) => d.invoice.id === id).length, 0);
  const r = R.buildReminder(get('SELECT * FROM invoices WHERE id = ?', [id]), 2);
  assert.match(r.subject, /Upomienka č\. 2/);
  assert.match(r.body, /UP1/);
  assert.equal(r.to, 'k@k.sk');
});

test('AI asistent: nástroje vyhľadávajú v databáze bez volania API', () => {
  const A = require('../src/services/assistant');
  const inv = A.runTool('search_invoices', { status: 'all', limit: 5 });
  assert.ok(Array.isArray(inv) && inv.length >= 1);
  assert.ok(inv[0].odkaz.startsWith('/invoices/'));
  assert.ok('zadrzne_zostava' in inv[0]);
  const ov = A.runTool('get_overview', {});
  assert.equal(typeof ov.zisk, 'number');
  assert.ok(Array.isArray(A.runTool('search_orders', { status: 'all' })));
  assert.ok(Array.isArray(A.runTool('search_timesheets', { query: 'x' })));
  assert.deepEqual(A.runTool('search_clients', { query: 'neexistuje-xyz' }), []);
  assert.ok(A.runTool('nope', {}).error);
  assert.equal(A.TOOLS.length, 8);
});

test('compliance a vyúčtovanie: AÜG, expirácie, MT940', () => {
  const C = require('../src/services/compliance');
  const S = require('../src/services/settlements');
  const P = require('../src/services/bankparser');
  run("INSERT INTO workers(first_name, last_name, hourly_cost, wage_rate, per_diem) VALUES ('Test', 'AUG', 10, 8, 1)");
  const wid = get('SELECT id FROM workers ORDER BY id DESC LIMIT 1').id;
  run("INSERT INTO clients(name) VALUES ('DE Bau GmbH')"); const cid = get('SELECT id FROM clients ORDER BY id DESC LIMIT 1').id;
  run("INSERT INTO sites(client_id, name, hourly_rate, country) VALUES (?, 'Halle', 20, 'DE')", [cid]); const sid = get('SELECT id FROM sites ORDER BY id DESC LIMIT 1').id;
  // 10 mesiacov týždenných lístkov -> Equal Pay upozornenie
  for (let k = 0; k < 44; k++) { const ws = U.weekStart(U.addDays(U.today(), -7 * (43 - k))); run("INSERT INTO timesheets(site_id, week_start, status) VALUES (?,?,'approved')", [sid, ws]); const tid = get('SELECT id FROM timesheets ORDER BY id DESC LIMIT 1').id; run('INSERT INTO timesheet_rows(timesheet_id, worker_id, d1, d2, d3, d4, d5) VALUES (?,?,8,8,8,8,8)', [tid, wid]); }
  const aug = C.augStatus().find((a) => a.worker_id === wid);
  assert.ok(aug && aug.months >= 9 && aug.months < 12, 'months ' + (aug && aug.months));
  assert.equal(aug.level, 'warn');
  run("INSERT INTO worker_documents(worker_id, type, valid_to) VALUES (?, 'a1', ?)", [wid, U.addDays(U.today(), 10)]);
  assert.ok(C.expiringDocuments(30).some((d) => d.worker_id === wid && d.days_left === 10));
  assert.ok(C.missingDocuments().some((m) => m.worker_id === wid && m.type === 'passport'));
  // vyúčtovanie za minulý mesiac
  const month = U.addMonths(U.monthStart(), -1).slice(0, 7);
  run("INSERT INTO worker_transactions(worker_id, date, type, amount) VALUES (?, ?, 'advance', 100)", [wid, month + '-10']);
  const id = S.create(wid, month, { per_diem_rate: 45 });
  const st = get('SELECT * FROM settlements WHERE id = ?', [id]);
  assert.ok(st.hours > 0); assert.equal(st.advances_total, 100); assert.equal(st.total_due, U.round2(st.wage_total + st.per_diem_total - 100));
  assert.throws(() => S.create(wid, month), /už existuje/);
  // MT940
  const mt = ':20:STMT\n:25:SK1234\n:28C:1\n:60F:C260901EUR1000,00\n:61:2609150915C1500,00NTRFNONREF//REF1\n:86:?20/VS/20260003?21uhrada?32DE Bau GmbH?38DE89370400440532013000\n:62F:C260915EUR2500,00\n';
  const tx = P.parseMt940(mt);
  assert.equal(tx.length, 1); assert.equal(tx[0].amount, 1500); assert.equal(tx[0].variable_symbol, '20260003'); assert.equal(tx[0].counterparty_name, 'DE Bau GmbH'); assert.equal(tx[0].date, '2026-09-15');
  assert.equal(P.parseStatement(Buffer.from(mt), 'vypis.sta').format, 'mt940');
});

test('PDF a XRechnung sa vygenerujú', async () => {
  const PDF = require('../src/services/pdf'); const XR = require('../src/services/xrechnung');
  const inv = { number: 'T1', variable_symbol: 'T1', language: 'de', issue_date: '2026-10-01', due_date: '2026-10-15', subtotal: 100, vat_amount: 0, total: 100, fees_total: 0, retention_amount: 5, retention_percent: 5, retention_due_date: '2027-04-01', withholding_amount: 0, amount_due: 95, skonto_percent: 0, skonto_amount: 0, vat_mode: 'eu_reverse', vat_rate: 0, client_name: 'DE Bau GmbH', client_address: 'Str. 1, München', client_ic_dph: 'DE123', items: [{ description: 'Maurer – Halle (KW40)', quantity: 5, unit: 'Std.', unit_price: 20, total: 100 }], fees: [] };
  const buf = await PDF.invoicePdf(inv);
  assert.ok(buf.length > 2000 && buf.slice(0, 4).toString() === '%PDF');
  const xml = XR.invoiceXml(inv);
  assert.match(xml, /<cbc:ID>T1<\/cbc:ID>/); assert.match(xml, /xrechnung_3\.0/); assert.match(xml, /<cbc:ID>AE<\/cbc:ID>/);
});
