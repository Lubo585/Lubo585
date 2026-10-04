// Compliance pre vyslanie do Nemecka: doklady, A1, AÜG limity, hlásenia, SOKA-BAU
const { all, get, getSettings } = require('../db');
const U = require('../utils');

const DOC_TYPES = {
  a1: 'Formulár A1 (sociálne poistenie)', passport: 'Cestovný pas / občiansky preukaz', residence: 'Povolenie na pobyt (SR)', work_permit: 'Pracovné povolenie / potvrdenie ÚPSVaR',
  vander_elst: 'Vízum Vander Elst (DE, pre občanov tretích krajín)', medical: 'Lekárska prehliadka', safety: 'Školenie BOZP', scc: 'Certifikát SCC / SGU', welding: 'Zváračský preukaz',
  driver: 'Vodičský preukaz', qualification: 'Kvalifikácia / výučný list', contract: 'Pracovná zmluva', insurance: 'Cestovné / úrazové poistenie', other: 'Iné',
};
const ASSIGNMENT_TYPES = { work: ['Nasadenie na zákazke', '#3b82f6'], home: ['Doma / voľno', '#9ca3af'], vacation: ['Dovolenka', '#16a34a'], sick: ['PN', '#dc2626'], travel: ['Cesta', '#f59e0b'], training: ['Školenie', '#8b5cf6'] };

function expiringDocuments(days) {
  days = days || Number(getSettings().doc_alert_days) || 60;
  const limit = U.addDays(U.today(), days);
  return all(`SELECT d.*, w.first_name, w.last_name, w.active FROM worker_documents d JOIN workers w ON w.id = d.worker_id WHERE w.active = 1 AND d.valid_to IS NOT NULL AND d.valid_to <= ? ORDER BY d.valid_to`, [limit])
    .map((d) => ({ ...d, type_label: DOC_TYPES[d.type] || d.type, days_left: U.diffDays(d.valid_to, U.today()), expired: d.valid_to < U.today() }));
}
// chýbajúce povinné doklady (A1 a pas) pre pracovníkov nasadených v DE za posledné 4 týždne
function missingDocuments() {
  const since = U.addDays(U.weekStart(), -28);
  const active = all(`SELECT DISTINCT w.id, w.first_name, w.last_name, w.eu_citizen FROM workers w JOIN timesheet_rows r ON r.worker_id = w.id JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id WHERE t.week_start >= ? AND s.country = 'DE' AND (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) > 0`, [since]);
  const out = [];
  for (const w of active) {
    const required = ['a1', 'passport'].concat(w.eu_citizen ? [] : ['residence', 'vander_elst']);
    for (const t of required) {
      const d = get('SELECT * FROM worker_documents WHERE worker_id = ? AND type = ? AND (valid_to IS NULL OR valid_to >= ?) ORDER BY valid_to DESC LIMIT 1', [w.id, t, U.today()]);
      if (!d) out.push({ worker_id: w.id, name: `${w.last_name} ${w.first_name}`, type: t, type_label: DOC_TYPES[t] });
    }
  }
  return out;
}
// AÜG: dĺžka nepretržitého nasadenia pracovníka u jedného klienta (prerušenie > 3 mesiace nuluje)
function augStatus() {
  const rows = all(`SELECT r.worker_id, s.client_id, t.week_start, (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) AS h, w.first_name, w.last_name, c.name AS client_name
    FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id JOIN workers w ON w.id = r.worker_id JOIN clients c ON c.id = s.client_id
    WHERE (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) > 0 ORDER BY r.worker_id, s.client_id, t.week_start`);
  const groups = new Map();
  for (const r of rows) { const k = r.worker_id + '|' + r.client_id; if (!groups.has(k)) groups.set(k, { worker_id: r.worker_id, client_id: r.client_id, name: `${r.last_name} ${r.first_name}`, client: r.client_name, weeks: [] }); groups.get(k).weeks.push(r.week_start); }
  const out = []; const today = U.today();
  for (const g of groups.values()) {
    // posledná súvislá perióda (medzera > 92 dní = nové nasadenie)
    let start = g.weeks[0], prev = g.weeks[0];
    for (const w of g.weeks) { if (U.diffDays(w, prev) > 92) start = w; prev = w; }
    const lastEnd = U.addDays(prev, 6);
    const active = U.diffDays(today, lastEnd) <= 28;
    const end = active ? today : lastEnd;
    const months = Math.round((U.diffDays(end, start) / 30.44) * 10) / 10;
    let level = 'ok', text = 'v poriadku';
    if (months >= 18) { level = 'danger'; text = 'prekročených 18 mesiacov – maximálna doba prenechania (§ 1 ods. 1b AÜG)'; }
    else if (months >= 16) { level = 'danger'; text = 'blíži sa limit 18 mesiacov'; }
    else if (months >= 9) { level = 'warn'; text = 'nad 9 mesiacov – povinnosť Equal Pay (§ 8 ods. 4 AÜG)'; }
    else if (months >= 7) { level = 'info'; text = 'o 2 mesiace Equal Pay'; }
    out.push({ ...g, start, last_week: prev, active, months, level, text, weeks_count: g.weeks.length });
  }
  return out.sort((a, b) => b.months - a.months);
}
// vyslania bez hlásenia (pracovník na DE stavbe za posledných 28 dní bez záznamu o hlásení)
function postingsMissing() {
  const since = U.addDays(U.weekStart(), -28);
  const rows = all(`SELECT DISTINCT w.id AS worker_id, w.first_name, w.last_name, s.id AS site_id, s.name AS site_name, c.name AS client_name, MIN(t.week_start) AS first_week
    FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id JOIN workers w ON w.id = r.worker_id JOIN clients c ON c.id = s.client_id
    WHERE t.week_start >= ? AND s.country = 'DE' AND (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) > 0 GROUP BY w.id, s.id`, [since]);
  return rows.filter((r) => !get('SELECT 1 FROM postings WHERE worker_id = ? AND (site_id = ? OR site_id IS NULL) AND notified_at IS NOT NULL AND (date_to IS NULL OR date_to >= ?)', [r.worker_id, r.site_id, since]));
}
function companyPermits() {
  const s = getSettings(); const out = [];
  const check = (label, date, number) => { if (!date) return out.push({ label, number, status: 'missing', text: 'nezadané' }); const d = U.diffDays(date, U.today()); out.push({ label, number, date, days: d, status: d < 0 ? 'danger' : d < 60 ? 'warn' : 'ok', text: d < 0 ? 'EXPIROVANÉ' : `platné ešte ${d} dní` }); };
  check('Povolenie na prenájom zamestnancov (AÜG / ADZ)', s.aug_permit_valid_until, s.aug_permit_number);
  check('Freistellungsbescheinigung § 48b EStG', s.freistellung_valid_until, s.freistellung_number);
  return out;
}
// SOKA-BAU: hodiny pracovníkov na stavbách so SOKA za mesiac
function sokaReport(month) {
  const from = month + '-01', to = U.monthEnd(from);
  const rows = all(`SELECT w.id, w.first_name, w.last_name, w.birth_date, s.name AS site_name, c.name AS client_name, t.week_start, r.d1, r.d2, r.d3, r.d4, r.d5, r.d6, r.d7
    FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id JOIN clients c ON c.id = s.client_id JOIN workers w ON w.id = r.worker_id
    WHERE (s.soka_bau = 1 OR c.soka_bau = 1) AND t.week_start <= ? AND t.week_start >= ?`, [to, U.addDays(from, -6)]);
  const byWorker = new Map();
  for (const r of rows) {
    for (let i = 0; i < 7; i++) {
      const day = U.addDays(r.week_start, i); if (day < from || day > to) continue;
      const h = r['d' + (i + 1)] || 0; if (!h) continue;
      const k = r.id; if (!byWorker.has(k)) byWorker.set(k, { worker_id: r.id, name: `${r.last_name} ${r.first_name}`, birth_date: r.birth_date, hours: 0, days: 0, sites: new Set() });
      const w = byWorker.get(k); w.hours += h; w.days++; w.sites.add(r.site_name);
    }
  }
  return [...byWorker.values()].map((w) => ({ ...w, hours: U.round2(w.hours), sites: [...w.sites].join(', ') }));
}
module.exports = { DOC_TYPES, ASSIGNMENT_TYPES, expiringDocuments, missingDocuments, augStatus, postingsMissing, companyPermits, sokaReport };
