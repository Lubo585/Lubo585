// Mesačné vyúčtovanie pracovníka: hodiny × mzda, diéty, zálohy, zrážky, bonusy
const { all, get, run, transaction, getSettings, log } = require('../db');
const U = require('../utils');

function monthData(workerId, month) {
  const w = get('SELECT * FROM workers WHERE id = ?', [workerId]);
  const from = month + '-01', to = U.monthEnd(from);
  const std = Number(getSettings().standard_hours_per_day) || 8;
  const rows = all(`SELECT r.*, t.week_start, s.name AS site_name, s.country, s.hours_per_day FROM timesheet_rows r JOIN timesheets t ON t.id = r.timesheet_id JOIN sites s ON s.id = t.site_id WHERE r.worker_id = ? AND t.week_start <= ? AND t.week_start >= ?`, [workerId, to, U.addDays(from, -6)]);
  let hours = 0, overtime = 0, days = 0, deDays = 0; const detail = [];
  for (const r of rows) {
    const sd = Number(r.hours_per_day) || std;
    for (let i = 0; i < 7; i++) {
      const day = U.addDays(r.week_start, i); if (day < from || day > to) continue;
      const h = r['d' + (i + 1)] || 0; if (!h) continue;
      hours += h; days++; if (r.country === 'DE' || r.country !== 'SK') deDays++;
      if (i < 5) overtime += Math.max(0, h - sd); else overtime += h; // víkend = nadčas
      detail.push({ day, hours: h, site: r.site_name });
    }
  }
  const tx = all('SELECT * FROM worker_transactions WHERE worker_id = ? AND settlement_id IS NULL AND date <= ?', [workerId, to]);
  const stays = all('SELECT s.*, l.name AS lodging_name FROM lodging_stays s JOIN lodgings l ON l.id = s.lodging_id WHERE s.worker_id = ? AND s.date_from <= ? AND (s.date_to IS NULL OR s.date_to >= ?)', [workerId, to, from]);
  return { worker: w, from, to, hours: U.round2(hours), overtime: U.round2(overtime), days, deDays, detail: detail.sort((a, b) => a.day.localeCompare(b.day)), transactions: tx, stays, std };
}
function create(workerId, month, opts = {}) {
  if (get('SELECT id FROM settlements WHERE worker_id = ? AND month = ?', [workerId, month])) throw new Error('Vyúčtovanie za tento mesiac už existuje.');
  const d = monthData(workerId, month); const s = getSettings();
  const wageRate = opts.wage_rate ?? d.worker.wage_rate ?? 0;
  const perDiemRate = opts.per_diem_rate ?? (d.worker.per_diem ? Number(s.per_diem_rate_de) || 0 : 0);
  const perDiemDays = opts.per_diem_days ?? d.deDays;
  return transaction(() => {
    const advances = U.round2(d.transactions.filter((t) => t.type === 'advance').reduce((a, t) => a + t.amount, 0));
    const deductions = U.round2(d.transactions.filter((t) => t.type === 'deduction').reduce((a, t) => a + t.amount, 0));
    const bonus = U.round2(d.transactions.filter((t) => t.type === 'bonus').reduce((a, t) => a + t.amount, 0));
    const wageTotal = U.round2(d.hours * wageRate); const perDiemTotal = U.round2(perDiemDays * perDiemRate);
    const total = U.round2(wageTotal + perDiemTotal + bonus - advances - deductions);
    const r = run('INSERT INTO settlements(worker_id, month, hours, overtime_hours, wage_rate, wage_total, per_diem_days, per_diem_rate, per_diem_total, advances_total, deductions_total, bonus_total, total_due, status, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [workerId, month, d.hours, d.overtime, wageRate, wageTotal, perDiemDays, perDiemRate, perDiemTotal, advances, deductions, bonus, total, 'draft', opts.note || '']);
    const id = Number(r.lastInsertRowid);
    run('UPDATE worker_transactions SET settlement_id = ? WHERE worker_id = ? AND settlement_id IS NULL AND date <= ?', [id, workerId, d.to]);
    log('settlement', `Vyúčtovanie ${month} pre ${d.worker.last_name} ${d.worker.first_name}: ${U.money(total)}`);
    return id;
  });
}
function recalc(id) {
  const st = get('SELECT * FROM settlements WHERE id = ?', [id]); if (!st) return;
  const tx = all('SELECT * FROM worker_transactions WHERE settlement_id = ?', [id]);
  const advances = U.round2(tx.filter((t) => t.type === 'advance').reduce((a, t) => a + t.amount, 0));
  const deductions = U.round2(tx.filter((t) => t.type === 'deduction').reduce((a, t) => a + t.amount, 0));
  const bonus = U.round2(tx.filter((t) => t.type === 'bonus').reduce((a, t) => a + t.amount, 0));
  const wageTotal = U.round2(st.hours * st.wage_rate); const perDiemTotal = U.round2(st.per_diem_days * st.per_diem_rate);
  run('UPDATE settlements SET wage_total=?, per_diem_total=?, advances_total=?, deductions_total=?, bonus_total=?, total_due=? WHERE id=?', [wageTotal, perDiemTotal, advances, deductions, bonus, U.round2(wageTotal + perDiemTotal + bonus - advances - deductions), id]);
}
module.exports = { monthData, create, recalc };
