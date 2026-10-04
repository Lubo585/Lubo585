// Naplní databázu ukážkovými dátami (vzorová firma, klienti v DE, pracovníci, lístky, faktúry, výpis...).
// Použitie:  npm run demo        (iba do prázdnej databázy)
//            npm run demo -- --force   (pridá ukážkové dáta aj do neprázdnej databázy)
require('dotenv').config();
const { all, get, run, setSetting, hashPassword, log } = require('../src/db');
const U = require('../src/utils');
const INV = require('../src/services/invoices');
const M = require('../src/services/matching');
const S = require('../src/services/settlements');

const force = process.argv.includes('--force');
if (get('SELECT COUNT(*) AS n FROM clients').n > 0 && !force) { console.log('Databáza už obsahuje dáta. Pre pridanie ukážky spustite: npm run demo -- --force'); process.exit(0); }

const today = U.today();
const ins = (sql, p) => Number(run(sql, p).lastInsertRowid);

// firma a používatelia
setSetting('company_iban', 'SK8975000000000012345671'); setSetting('company_bic', 'CEKOSKBX'); setSetting('company_email', 'office@sxworkforce.sk'); setSetting('company_phone', '+421 900 123 456');
setSetting('company_register', 'Zapísaná v OR OS Bratislava III, oddiel Sro'); setSetting('aug_permit_number', 'AÜG 2023/0456'); setSetting('aug_permit_valid_until', U.addMonths(today, 14));
setSetting('freistellung_number', 'FB-2024-7781'); setSetting('freistellung_valid_until', U.addMonths(today, 5)); setSetting('soka_number', '1234567'); setSetting('default_language_documents', 'de');
for (const [u, n, r] of [['kancelaria', 'Jana Nováková', 'office'], ['dispecer', 'Peter Horváth', 'dispatcher'], ['uctovnik', 'Mária Kováčová', 'accountant']]) if (!get('SELECT id FROM users WHERE username = ?', [u])) run('INSERT INTO users(username, password_hash, name, role, email) VALUES (?,?,?,?,?)', [u, hashPassword('demo1234'), n, r, u + '@sxworkforce.sk']);

// klienti
const c1 = ins("INSERT INTO clients(name, ico, dic, ic_dph, address, email, invoice_email, phone, contact_person, due_days, retention_percent, retention_months, skonto_percent, skonto_days, country, vat_mode, register, language, soka_bau, bauabzugsteuer) VALUES ('Bauunternehmen Müller GmbH','HRB 24871','143/123/45678','DE811234567','Industriestraße 12, 80339 München','buchhaltung@mueller-bau.de','rechnungen@mueller-bau.de','+49 89 1234567','Herr Stefan Müller',30,5,6,2,10,'DE','eu_reverse','Amtsgericht München, HRB 24871','de',1,1)");
const c2 = ins("INSERT INTO clients(name, ico, ic_dph, address, email, invoice_email, contact_person, due_days, retention_percent, retention_months, country, vat_mode, register, language, soka_bau) VALUES ('Hochtief Süd AG','HRB 9981','DE129876543','Hauptstraße 5, 70173 Stuttgart','ap@hochtief-sued.de','ap@hochtief-sued.de','Frau Anke Weber',45,10,12,'DE','eu_reverse','Amtsgericht Stuttgart, HRB 9981','de',1)");
const c3 = ins("INSERT INTO clients(name, ico, dic, ic_dph, address, email, contact_person, due_days, country, vat_mode, language) VALUES ('STAVBY BA s.r.o.','44556677','2022334455','SK2022334455','Vajnorská 100, 831 04 Bratislava','fakturacia@stavbyba.sk','Ing. Novák',14,'SK','domestic_reverse','sk')");
for (const [c, p, r] of [[c1, 'murár', 24], [c1, 'tesár', 25], [c1, 'pomocný pracovník', 19], [c2, 'železiar', 26], [c2, 'pomocný pracovník', 20], [c3, 'murár', 18]]) run('INSERT INTO client_rates(client_id, profession, rate, overtime_pct, saturday_pct, sunday_pct, night_pct) VALUES (?,?,?,25,25,50,25)', [c, p, r]);
run("INSERT INTO contracts(client_id, type, number, signed_at, valid_from, valid_to) VALUES (?,'AUG','AÜV-2025-03',?,?,?)", [c1, U.addMonths(today, -8), U.addMonths(today, -8), U.addMonths(today, 4)]);
run("INSERT INTO contracts(client_id, type, number, signed_at, valid_from) VALUES (?,'RAHMEN','RV-2026-01',?,?)", [c2, U.addMonths(today, -3), U.addMonths(today, -3)]);

// zákazky
const s1 = ins("INSERT INTO sites(client_id, name, address, hourly_rate, status, start_date, end_date, workers_needed, country, soka_bau, profession, contact_person, contact_phone) VALUES (?,'Wohnanlage Pasing – Rohbau','Bodenseestraße 44, München',24,'active',?,?,6,'DE',1,'murár','Polier Hans Gruber','+49 170 5556677')", [c1, U.addMonths(today, -7), U.addMonths(today, 3)]);
const s2 = ins("INSERT INTO sites(client_id, name, address, hourly_rate, status, start_date, end_date, workers_needed, country, soka_bau, profession) VALUES (?,'Logistikhalle Stuttgart-Ost','Am Hafen 3, Stuttgart',26,'active',?,?,4,'DE',1,'železiar')", [c2, U.addMonths(today, -2), U.addMonths(today, 6)]);
const s3 = ins("INSERT INTO sites(client_id, name, address, hourly_rate, status, start_date, workers_needed, country, description) VALUES (?,'Bürogebäude Freiham','Freiham Nord, München',24,'open',?,8,'DE','Hrubá stavba, potrební murári a tesári, začiatok po dohode')", [c1, U.addMonths(today, 1)]);
const s4 = ins("INSERT INTO sites(client_id, name, address, hourly_rate, status, start_date, end_date, workers_needed, country) VALUES (?,'Bytový dom Petržalka','Jasovská 8, Bratislava',18,'finished',?,?,3,'SK')", [c3, U.addMonths(today, -9), U.addMonths(today, -3)]);

// pracovníci
const W = [['Ivan', 'Kovalenko', 'Ukrajina', 'murár', 10, 8.5, 0], ['Oleh', 'Shevchenko', 'Ukrajina', 'tesár', 10.5, 9, 0], ['Vasyl', 'Melnyk', 'Ukrajina', 'pomocný pracovník', 8.5, 7, 0], ['Andrij', 'Bondar', 'Ukrajina', 'železiar', 11, 9.5, 0], ['Marek', 'Šimko', 'Slovensko', 'murár', 11, 9.5, 1], ['Jozef', 'Baláž', 'Slovensko', 'železiar', 11.5, 10, 1], ['Serhij', 'Tkačenko', 'Ukrajina', 'pomocný pracovník', 8.5, 7, 0]];
const wid = W.map(([f, l, n, p, cost, wage, eu], i) => ins('INSERT INTO workers(first_name, last_name, nationality, position, hourly_cost, wage_rate, eu_citizen, phone, birth_date, iban, german_level, per_diem, hired_at, lohngruppe) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)', [f, l, n, p, cost, wage, eu, '+421 9' + String(10000000 + i * 1234567).slice(0, 8), `198${i}-0${(i % 9) + 1}-1${i}`, 'SK' + String(1000000000000000000 + i * 777).slice(0, 22), ['A2', 'B1', 'A1', 'A2', 'B2', 'B1', 'žiadna'][i], U.addMonths(today, -14 + i), ['LG 3', 'LG 3', 'LG 1', 'LG 4', 'LG 3', 'LG 4', 'LG 1'][i]]));
wid.forEach((w, i) => {
  run("INSERT INTO worker_documents(worker_id, type, number, issued_by, valid_from, valid_to) VALUES (?,'a1',?,?,?,?)", [w, 'A1-2026-' + (1000 + i), 'Sociálna poisťovňa', U.addMonths(today, -6), U.addMonths(today, i === 2 ? 0 : 6 + i)]);
  run("INSERT INTO worker_documents(worker_id, type, number, valid_to) VALUES (?,'passport',?,?)", [w, 'FE' + (120000 + i * 37), U.addMonths(today, 20 + i * 3)]);
  if (!W[i][6]) { run("INSERT INTO worker_documents(worker_id, type, number, issued_by, valid_to) VALUES (?,'residence',?,?,?)", [w, 'PP' + (556000 + i), 'OCP PZ Bratislava', U.addMonths(today, i === 6 ? 1 : 12)]); if (i !== 6) run("INSERT INTO worker_documents(worker_id, type, number, valid_to) VALUES (?,'vander_elst',?,?)", [w, 'VE-' + (77000 + i), U.addMonths(today, 9)]); }
  run("INSERT INTO worker_documents(worker_id, type, valid_to) VALUES (?,'medical',?)", [w, U.addMonths(today, 10)]);
  if (i < 2) run("INSERT INTO worker_documents(worker_id, type, number, valid_to) VALUES (?,'scc',?,?)", [w, 'SCC-' + (4400 + i), U.addMonths(today, 30)]);
});
// vyslania (hlásenia) – jedno chýba naschvál
wid.slice(0, 4).forEach((w, i) => { if (i === 3) return; run("INSERT INTO postings(worker_id, site_id, client_id, date_from, date_to, notified_at, portal_ref) VALUES (?,?,?,?,?,?,?)", [w, i < 3 ? s1 : s2, i < 3 ? c1 : c2, U.addMonths(today, -7), U.addMonths(today, 3), U.addDays(U.addMonths(today, -7), -3), 'MP-' + (880000 + i)]); });
run("INSERT INTO postings(worker_id, site_id, client_id, date_from, date_to, notified_at, portal_ref) VALUES (?,?,?,?,?,?,?)", [wid[4], s1, c1, U.addMonths(today, -7), U.addMonths(today, 3), U.addMonths(today, -7), 'MP-880099']);
run("INSERT INTO postings(worker_id, site_id, client_id, date_from, date_to, notified_at, portal_ref) VALUES (?,?,?,?,?,?,?)", [wid[5], s2, c2, U.addMonths(today, -2), U.addMonths(today, 6), U.addDays(U.addMonths(today, -2), -2), 'MP-881234']);

// plán nasadení (tento a budúci mesiac)
const mStart = U.monthStart(today), mEnd = U.monthEnd(U.addMonths(today, 1));
for (const w of [wid[0], wid[1], wid[2], wid[4]]) run("INSERT INTO assignments(worker_id, site_id, type, date_from, date_to) VALUES (?,?,'work',?,?)", [w, s1, mStart, mEnd]);
for (const w of [wid[3], wid[5]]) run("INSERT INTO assignments(worker_id, site_id, type, date_from, date_to) VALUES (?,?,'work',?,?)", [w, s2, mStart, mEnd]);
run("INSERT INTO assignments(worker_id, type, date_from, date_to, note) VALUES (?,'vacation',?,?,'dovolenka doma')", [wid[6], U.addDays(today, 3), U.addDays(today, 12)]);
run("INSERT INTO assignments(worker_id, type, date_from, date_to) VALUES (?,'home',?,?)", [wid[1], U.addDays(today, 14), U.addDays(today, 20)]);

// hodinové lístky: posledných 10 týždňov
const crews = [[s1, [wid[0], wid[1], wid[2], wid[4]]], [s2, [wid[3], wid[5]]]];
for (let k = 10; k >= 1; k--) {
  const ws = U.weekStart(U.addDays(today, -7 * k));
  for (const [site, crew] of crews) {
    const wk = U.isoWeek(ws);
    const tid = ins('INSERT INTO timesheets(site_id, week_start, status, number, signed_by, signed_at) VALUES (?,?,?,?,?,?)', [site, ws, k >= 2 ? 'approved' : 'draft', `${wk.year}-${String(wk.week).padStart(2, '0')}-${site}`, k >= 2 ? 'Hans Gruber' : null, k >= 2 ? U.addDays(ws, 6) + ' 16:30:00' : null]);
    crew.forEach((w, j) => {
      const base = 8 + (j % 2); const ot = k % 3 === 0 ? 1.5 : 0;
      run('INSERT INTO timesheet_rows(timesheet_id, worker_id, profession, d1, d2, d3, d4, d5, d6, s1, e1, b1, s2, e2, b2, s3, e3, b3, s4, e4, b4, s5, e5, b5, night_hours) VALUES (?,?,(SELECT position FROM workers WHERE id = ?),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [tid, w, w, base + ot, base, base + ot, base, base - 1, k % 4 === 0 ? 5 : 0, '07:00', base + ot === 9.5 ? '17:00' : base + ot === 9 ? '16:30' : '16:00', 30, '07:00', base === 9 ? '16:30' : '16:00', 30, '07:00', base + ot === 9.5 ? '17:00' : base + ot === 9 ? '16:30' : '16:00', 30, '07:00', base === 9 ? '16:30' : '16:00', 30, '07:00', base === 9 ? '15:30' : '15:00', 30, j === 0 && k % 5 === 0 ? 4 : 0]);
    });
  }
}
// staré SK lístky (ukončená zákazka), vyfakturované
const oldFrom = U.weekStart(U.addMonths(today, -5));
for (let k = 0; k < 4; k++) { const ws = U.addDays(oldFrom, 7 * k); const tid = ins("INSERT INTO timesheets(site_id, week_start, status) VALUES (?,?,'approved')", [s4, ws]); for (const w of [wid[4], wid[5], wid[6]]) run('INSERT INTO timesheet_rows(timesheet_id, worker_id, d1, d2, d3, d4, d5) VALUES (?,?,8,8,8,8,8)', [tid, w]); }

// faktúry: 2 mesiace späť pre DE klientov z lístkov + SK faktúra
const prevMonth = U.addMonths(mStart, -1), prev2 = U.addMonths(mStart, -2);
const invA = INV.createFromTimesheets({ clientId: c1, siteId: s1, from: U.weekStart(prev2), to: U.monthEnd(prev2), issueDate: U.addDays(U.monthEnd(prev2), 3) });
const invB = INV.createFromTimesheets({ clientId: c2, siteId: s2, from: U.weekStart(prev2), to: U.monthEnd(prev2), issueDate: U.addDays(U.monthEnd(prev2), 3) });
const invC = INV.createFromTimesheets({ clientId: c1, siteId: s1, from: U.monthStart(prevMonth), to: U.monthEnd(prevMonth), issueDate: U.addDays(U.monthEnd(prevMonth), 2) });
const invD = INV.createFromTimesheets({ clientId: c3, siteId: s4, from: oldFrom, to: U.addDays(oldFrom, 28), issueDate: U.addDays(oldFrom, 30) });
run("UPDATE invoices SET sent_at = issue_date || ' 09:12:00', sent_to = 'rechnungen@mueller-bau.de' WHERE id IN (?,?)", [invA, invC]);
// cenová ponuka
const q = ins("INSERT INTO quotes(number, client_id, site_id, date, valid_until, status, language, note) VALUES ('CP' || strftime('%Y','now') || '007', ?, ?, ?, ?, 'sent', 'de', 'Unterkunft und Anreise im Preis enthalten.')", [c1, s3, U.addDays(today, -5), U.addDays(today, 25)]);
let qs = 0; for (const [d, qty, p] of [['Maurer (LG 3) – Stundensatz', 1, 24], ['Zimmerer (LG 3) – Stundensatz', 1, 25], ['Bauhelfer (LG 1) – Stundensatz', 1, 19]]) { run('INSERT INTO quote_items(quote_id, description, quantity, unit, unit_price, total) VALUES (?,?,?,?,?,?)', [q, d, qty, 'Std.', p, qty * p]); qs += qty * p; } run('UPDATE quotes SET subtotal = ? WHERE id = ?', [qs, q]);

// bankový výpis: úhrady (A so skontom v lehote, B čiastočne, D celá, SK), + neznáma platba a výdavky
const a = get('SELECT * FROM invoices WHERE id = ?', [invA]), b = get('SELECT * FROM invoices WHERE id = ?', [invB]), d = get('SELECT * FROM invoices WHERE id = ?', [invD]);
M.importTransactions([
  { hash: 'demo1', date: U.addDays(a.issue_date, 6), amount: U.round2(a.amount_due - a.skonto_amount), currency: 'EUR', counterparty_name: 'Bauunternehmen Mueller GmbH', counterparty_iban: 'DE89370400440532013000', variable_symbol: a.number, message: 'Rechnung ' + a.number + ' abzgl. 2% Skonto' },
  { hash: 'demo2', date: U.addDays(b.issue_date, 20), amount: U.round2(b.amount_due * 0.6), currency: 'EUR', counterparty_name: 'Hochtief Sued AG', counterparty_iban: 'DE02120300000000202051', variable_symbol: b.number, message: 'Teilzahlung ' + b.number },
  { hash: 'demo3', date: U.addDays(d.issue_date, 12), amount: d.amount_due, currency: 'EUR', counterparty_name: 'STAVBY BA s.r.o.', counterparty_iban: 'SK3112000000198742637541', variable_symbol: d.number, message: 'uhrada FA' },
  { hash: 'demo4', date: U.addDays(today, -3), amount: 1250, currency: 'EUR', counterparty_name: 'HOLZBAU KRAUS KG', counterparty_iban: 'DE44500105175407324931', variable_symbol: null, message: 'Abschlag Oktober' },
  { hash: 'demo5', date: U.addDays(today, -8), amount: -1840, currency: 'EUR', counterparty_name: 'Pension Alpenblick', counterparty_iban: 'DE12345678901234567890', message: 'Miete Unterkunft' },
  { hash: 'demo6', date: U.addDays(today, -2), amount: -312.4, currency: 'EUR', counterparty_name: 'Shell Deutschland', message: 'Tankstelle A8' },
], { source: 'email', subject: 'Výpis z účtu', from: 'vypisy@csob.sk', filename: 'vypis-camt053.xml' });

// náklady
for (const [m, cat, desc, sup, net, vat, rec] of [[0, 'Ubytovanie pracovníkov', 'Pension Alpenblick – 6 lôžok', 'Pension Alpenblick', 1840, 0, 1], [0, 'Poistenie', 'Úrazové poistenie pracovníkov', 'Allianz', 210, 0, 1], [0, 'Účtovníctvo a právne služby', 'Vedenie účtovníctva', 'Účtovníctvo Plus s.r.o.', 350, 23, 1], [0, 'Telekomunikácie a software', 'Mobilné paušály', 'O2', 120, 23, 1], [0, 'Lízing a splátky', 'Lízing VW Transporter', 'VW Leasing', 480, 23, 1], [1, 'Ubytovanie pracovníkov', 'Pension Alpenblick – 6 lôžok', 'Pension Alpenblick', 1840, 0, 1], [1, 'Doprava a PHM', 'PHM cesty do DE', 'Shell', 640, 23, 0], [1, 'Náradie a OOPP', 'Pracovná obuv a odevy', 'Engelbert Strauss', 420, 23, 0], [2, 'Ubytovanie pracovníkov', 'Pension Alpenblick – 6 lôžok', 'Pension Alpenblick', 1840, 0, 1], [2, 'Marketing a nábor', 'Inzercia – nábor pracovníkov', 'Profesia.sk', 180, 23, 0], [2, 'Dane a poplatky', 'SOKA-BAU príspevky', 'SOKA-BAU', 2150, 0, 0]]) run('INSERT INTO expenses(date, category, description, supplier, amount_net, vat_rate, amount_total, recurring, paid) VALUES (?,?,?,?,?,?,?,?,1)', [U.addDays(U.monthStart(U.addMonths(today, -m)), 4), cat, desc, sup, net, vat, U.round2(net * (1 + vat / 100)), rec]);

// ubytovanie, vozidlá
const l1 = ins("INSERT INTO lodgings(name, address, city, country, capacity, price_per_night, monthly_cost, landlord, contact) VALUES ('Pension Alpenblick','Rosenheimer Str. 88','München','DE',6,10,1840,'Familie Huber','+49 89 4455667')");
const l2 = ins("INSERT INTO lodgings(name, address, city, country, capacity, price_per_night, landlord) VALUES ('Monteurzimmer Stuttgart-Ost','Wasenstraße 7','Stuttgart','DE',4,16,'Herr Krämer')");
for (const w of [wid[0], wid[1], wid[2], wid[4]]) run("INSERT INTO lodging_stays(lodging_id, worker_id, date_from, price_per_night, charge_to) VALUES (?,?,?,10,'worker')", [l1, w, U.addMonths(today, -7)]);
for (const w of [wid[3], wid[5]]) run("INSERT INTO lodging_stays(lodging_id, worker_id, date_from, price_per_night, charge_to) VALUES (?,?,?,16,'company')", [l2, w, U.addMonths(today, -2)]);
const v1 = ins("INSERT INTO vehicles(plate, name, seats, inspection_until, insurance_until) VALUES ('BA 123 XY','VW Transporter T6',9,?,?)", [U.addDays(today, 25), U.addMonths(today, 7)]);
run("INSERT INTO trips(vehicle_id, driver_worker_id, date, date_to, route_from, route_to, km, purpose, site_id, cost, passengers) VALUES (?,?,?,?,'Bratislava','München',560,'preprava pracovníkov',?,92.5,'Kovalenko, Shevchenko, Melnyk')", [v1, wid[4], U.addDays(today, -9), U.addDays(today, -9), s1]);
run("INSERT INTO trips(vehicle_id, driver_worker_id, date, route_from, route_to, km, purpose, site_id, cost) VALUES (?,?,?,'München','Stuttgart',230,'prevoz náradia',?,38)", [v1, wid[4], U.addDays(today, -4), s2]);

// zálohy a vyúčtovanie za minulý mesiac
run("INSERT INTO worker_transactions(worker_id, date, type, description, amount) VALUES (?,?,'advance','záloha v hotovosti na stavbe',300)", [wid[0], U.addDays(U.monthStart(prevMonth), 12)]);
run("INSERT INTO worker_transactions(worker_id, date, type, description, amount) VALUES (?,?,'bonus','prémia za kvalitu',150)", [wid[1], U.monthEnd(prevMonth)]);
run("INSERT INTO worker_transactions(worker_id, date, type, description, amount) VALUES (?,?,'advance','záloha',200)", [wid[3], U.addDays(U.monthStart(today), 3)]);
for (const w of [wid[0], wid[1], wid[2], wid[3], wid[4], wid[5]]) { const id = S.create(w, prevMonth.slice(0, 7)); if (w !== wid[3]) run("UPDATE settlements SET status='paid', paid_at=? WHERE id=?", [U.addDays(mStart, 8), id]); }

// úlohy
const admin = get("SELECT id FROM users WHERE username='admin'").id, disp = get("SELECT id FROM users WHERE username='dispecer'").id, acc = get("SELECT id FROM users WHERE username='uctovnik'").id;
for (const [t, desc, to, pr, due, st, site, w] of [['Predĺžiť A1 pre Melnyka', 'Končí o 2 týždne, podať na Sociálnu poisťovňu', disp, 'high', U.addDays(today, 5), 'progress', null, wid[2]], ['Nahlásiť vyslanie Bondara na Meldeportal', 'Zatiaľ bez hlásenia, stavba Stuttgart', disp, 'high', U.addDays(today, 1), 'new', s2, wid[3]], ['Poslať upomienku Hochtief – čiastočná úhrada', 'Zostáva 40 % faktúry', acc, 'normal', U.addDays(today, 3), 'new', null, null], ['Zabezpečiť 2 murárov pre Freiham od budúceho mesiaca', 'Klient potvrdil ponuku CP ústne', disp, 'normal', U.addDays(today, 14), 'new', s3, null], ['Objednať zimné pracovné bundy', '7 ks podľa veľkostí v kartách', disp, 'low', U.addDays(today, 20), 'waiting', null, null], ['Pripraviť podklady pre SOKA-BAU za minulý mesiac', '', acc, 'normal', U.addDays(today, -2), 'done', null, null]]) {
  const id = ins('INSERT INTO tasks(title, description, assigned_by, assigned_to, priority, due_date, status, site_id, worker_id, done_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [t, desc, admin, to, pr, due, st, site, w, st === 'done' ? U.addDays(today, -3) : null]);
  run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (?,?,'assign','Úloha vytvorená')", [id, admin]);
}
run("INSERT INTO task_comments(task_id, user_id, type, text) VALUES (1, ?, 'comment', 'Formulár odoslaný, čakám na potvrdenie.')", [disp]);
log('demo', 'Načítané ukážkové dáta');
console.log(`Hotovo. Ukážkové dáta: ${get('SELECT COUNT(*) n FROM workers').n} pracovníkov, ${get('SELECT COUNT(*) n FROM clients').n} klienti, ${get('SELECT COUNT(*) n FROM timesheets').n} lístkov, ${get('SELECT COUNT(*) n FROM invoices').n} faktúry, ${get('SELECT COUNT(*) n FROM bank_transactions').n} bankových transakcií.`);
console.log('Prihlásenie: admin / ' + (process.env.ADMIN_PASSWORD || 'admin') + '  ·  kancelaria, dispecer, uctovnik / demo1234');
