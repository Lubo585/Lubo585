// Pomocné funkcie: dátumy, peniaze, formátovanie
function pad(n) { return String(n).padStart(2, '0'); }

function toISO(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function today() { return toISO(new Date()); }
function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, days) {
  const d = parseDate(s); d.setDate(d.getDate() + Number(days || 0)); return toISO(d);
}
function addMonths(s, months) {
  const d = parseDate(s); d.setMonth(d.getMonth() + Number(months || 0)); return toISO(d);
}
function diffDays(a, b) { // a - b v dňoch
  return Math.round((parseDate(a) - parseDate(b)) / 86400000);
}
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
// pondelok týždňa pre daný dátum
function weekStart(s) {
  const d = parseDate(s || today());
  const day = (d.getDay() + 6) % 7; // 0 = pondelok
  d.setDate(d.getDate() - day);
  return toISO(d);
}
function isoWeek(s) {
  const d = parseDate(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { week: Math.ceil((((t - yearStart) / 86400000) + 1) / 7), year: t.getUTCFullYear() };
}
function monthStart(s) { return (s || today()).slice(0, 7) + '-01'; }
function monthEnd(s) {
  const d = parseDate(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return toISO(d);
}

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function money(n, cur = '€') {
  const v = round2(n);
  const s = v.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur ? `${s} ${cur}` : s;
}
function num(v, def = 0) {
  if (v === undefined || v === null || v === '') return def;
  const n = parseFloat(String(v).replace(',', '.').replace(/\s/g, ''));
  return isNaN(n) ? def : n;
}
function hours(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const DAY_NAMES = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const MONTH_NAMES = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];

const EXPENSE_CATEGORIES = [
  'Mzdy a odvody', 'Ubytovanie pracovníkov', 'Doprava a PHM', 'Cestovné a diéty', 'Poistenie',
  'Náradie a OOPP', 'Kancelária a administratíva', 'Účtovníctvo a právne služby', 'Marketing a nábor',
  'Lízing a splátky', 'Telekomunikácie a software', 'Dane a poplatky', 'Ostatné'
];

module.exports = { toISO, today, parseDate, addDays, addMonths, diffDays, fmtDate, weekStart, isoWeek, monthStart, monthEnd, round2, money, num, hours, DAY_NAMES, MONTH_NAMES, EXPENSE_CATEGORIES };
