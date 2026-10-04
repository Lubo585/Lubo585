const router = require('express').Router();
const multer = require('multer');
const A = require('../services/attachments');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/upload', upload.array('files', 10), (req, res) => {
  const { entity_type, entity_id, back, kind, note } = req.body;
  let n = 0; const errors = [];
  for (const f of req.files || []) {
    try { A.save({ entityType: entity_type, entityId: Number(entity_id), buffer: f.buffer, filename: f.originalname, mime: f.mimetype, userId: req.session.user.id, kind: kind || 'file', note: note || '' }); n++; }
    catch (e) { errors.push(e.message); }
  }
  req.flash(errors.length ? 'err' : 'ok', errors.length ? errors.join(' | ') : `Nahraných súborov: ${n}.`);
  res.redirect(back || '/');
});
router.get('/:id', (req, res) => {
  const a = A.find(req.params.id);
  if (!a) return res.status(404).render('error', { title: 'Chyba', message: 'Príloha neexistuje' });
  if (req.session.user.role === 'worker') {
    // pracovník vidí iba svoje prílohy
    const ok = (a.entity_type === 'worker' && a.entity_id === req.session.user.worker_id) || (a.entity_type === 'worker_document' && require('../db').get('SELECT 1 FROM worker_documents WHERE id = ? AND worker_id = ?', [a.entity_id, req.session.user.worker_id]));
    if (!ok) return res.status(403).send('Nemáte prístup.');
  }
  res.setHeader('Content-Disposition', (req.query.dl ? 'attachment' : 'inline') + `; filename*=UTF-8''${encodeURIComponent(a.filename)}`);
  res.type(a.mime || 'application/octet-stream');
  res.sendFile(A.filePath(a));
});
router.post('/:id/delete', (req, res) => {
  if (req.session.user.role === 'worker') return res.status(403).send('Nemáte prístup.');
  A.remove(req.params.id); req.flash('ok', 'Príloha odstránená.'); res.redirect(req.body.back || '/');
});
module.exports = router;
