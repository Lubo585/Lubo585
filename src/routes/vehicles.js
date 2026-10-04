// Vozidlá a jazdy do Nemecka
const router = require('express').Router();
const { all, get, run, log } = require('../db');
const U = require('../utils');

router.get('/', (req, res) => {
  const month = (req.query.month || U.today()).slice(0, 7);
  const vehicles = all('SELECT v.*, (SELECT COALESCE(SUM(km),0) FROM trips t WHERE t.vehicle_id = v.id AND t.date LIKE ?) AS km_month, (SELECT COALESCE(SUM(cost),0) FROM trips t WHERE t.vehicle_id = v.id AND t.date LIKE ?) AS cost_month FROM vehicles v ORDER BY v.active DESC, v.plate', [month + '%', month + '%']);
  const trips = all('SELECT t.*, v.plate, w.first_name, w.last_name, s.name AS site_name FROM trips t LEFT JOIN vehicles v ON v.id = t.vehicle_id LEFT JOIN workers w ON w.id = t.driver_worker_id LEFT JOIN sites s ON s.id = t.site_id WHERE t.date LIKE ? ORDER BY t.date DESC, t.id DESC', [month + '%']);
  const alerts = vehicles.filter((v) => v.active && ((v.inspection_until && v.inspection_until < U.addDays(U.today(), 30)) || (v.insurance_until && v.insurance_until < U.addDays(U.today(), 30))));
  res.render('vehicles/index', { title: 'Vozidlá a jazdy', vehicles, trips, month, alerts, workers: all('SELECT id, first_name, last_name FROM workers WHERE active = 1 ORDER BY last_name'), sites: all("SELECT id, name FROM sites WHERE status != 'finished' ORDER BY name") });
});
router.post('/save', (req, res) => {
  const b = req.body; const vals = [b.plate.trim().toUpperCase(), b.name || '', parseInt(b.seats, 10) || 5, b.active ? 1 : 0, b.inspection_until || null, b.insurance_until || null, b.note || ''];
  if (b.id) run('UPDATE vehicles SET plate=?, name=?, seats=?, active=?, inspection_until=?, insurance_until=?, note=? WHERE id=?', [...vals, b.id]);
  else { run('INSERT INTO vehicles(plate, name, seats, active, inspection_until, insurance_until, note) VALUES (?,?,?,?,?,?,?)', vals); log('vehicle', `Pridané vozidlo ${b.plate}`); }
  req.flash('ok', 'Vozidlo uložené.'); res.redirect('/vehicles');
});
router.post('/:id/delete', (req, res) => { run('DELETE FROM vehicles WHERE id = ?', [req.params.id]); res.redirect('/vehicles'); });
router.post('/trips/save', (req, res) => {
  const b = req.body; const vals = [b.vehicle_id || null, b.driver_worker_id || null, b.driver_name || '', b.date, b.date_to || null, b.route_from || '', b.route_to || '', U.num(b.km), b.purpose || '', b.site_id || null, U.num(b.cost), b.passengers || '', b.note || ''];
  if (b.trip_id) run('UPDATE trips SET vehicle_id=?, driver_worker_id=?, driver_name=?, date=?, date_to=?, route_from=?, route_to=?, km=?, purpose=?, site_id=?, cost=?, passengers=?, note=? WHERE id=?', [...vals, b.trip_id]);
  else run('INSERT INTO trips(vehicle_id, driver_worker_id, driver_name, date, date_to, route_from, route_to, km, purpose, site_id, cost, passengers, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', vals);
  // náklad na PHM/cestu do nákladov firmy
  if (U.num(b.cost) > 0 && b.as_expense) run("INSERT INTO expenses(date, category, description, supplier, amount_net, vat_rate, amount_total, site_id, paid, note) VALUES (?,?,?,?,?,?,?,?,1,?)", [b.date, 'Doprava a PHM', `Jazda ${b.route_from || ''} – ${b.route_to || ''}`, '', U.round2(U.num(b.cost) / 1.23), 23, U.num(b.cost), b.site_id || null, 'Z knihy jázd']);
  req.flash('ok', 'Jazda uložená.'); res.redirect('/vehicles?month=' + b.date.slice(0, 7));
});
router.post('/trips/:id/delete', (req, res) => { run('DELETE FROM trips WHERE id = ?', [req.params.id]); res.redirect(req.body.back || '/vehicles'); });
module.exports = router;
