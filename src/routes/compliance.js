const router = require('express').Router();
const C = require('../services/compliance');
const U = require('../utils');
const { getSettings } = require('../db');

router.get('/', (req, res) => {
  const month = (req.query.month || U.today()).slice(0, 7);
  res.render('compliance/index', { title: 'Compliance – vyslanie do Nemecka', permits: C.companyPermits(), expiring: C.expiringDocuments(), missing: C.missingDocuments(), aug: C.augStatus(), postings: C.postingsMissing(), soka: C.sokaReport(month), month, alertDays: Number(getSettings().doc_alert_days) || 60, DOC_TYPES: C.DOC_TYPES });
});
router.get('/soka.csv', (req, res) => {
  const month = (req.query.month || U.today()).slice(0, 7);
  const rows = C.sokaReport(month);
  res.setHeader('Content-Disposition', `attachment; filename="soka-${month}.csv"`); res.type('text/csv');
  res.send('﻿' + ['Pracovník;Dátum narodenia;Stavby;Dni;Hodiny'].concat(rows.map((r) => [r.name, r.birth_date ? U.fmtDate(r.birth_date) : '', r.sites, r.days, String(r.hours).replace('.', ',')].join(';'))).join('\r\n'));
});
module.exports = router;
