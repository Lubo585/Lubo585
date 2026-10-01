const router = require('express').Router();
const A = require('../services/assistant');

// história rozhovoru je v session (append-only, orezaná v službe)
router.get('/', (req, res) => {
  res.render('assistant/index', { title: 'AI asistent', configured: A.isConfigured(), history: (req.session.aiDisplay || []) });
});
router.post('/ask', async (req, res) => {
  const q = String((req.body && req.body.question) || '').trim().slice(0, 2000);
  if (!q) return res.status(400).json({ error: 'Prázdna otázka.' });
  if (!A.isConfigured()) return res.status(400).json({ error: 'AI asistent nie je nastavený. Zadajte API kľúč v Nastavenia → AI asistent.', settings: '/settings?tab=ai' });
  try {
    const r = await A.ask({ history: req.session.aiMessages || [], question: q, user: req.session.user });
    // pre ďalšie kolo uchováme iba textové správy (bez tool blokov), aby session ostala malá
    const hist = (req.session.aiMessages || []).concat([{ role: 'user', content: q }, { role: 'assistant', content: r.text }]).slice(-20);
    req.session.aiMessages = hist;
    req.session.aiDisplay = ((req.session.aiDisplay || []).concat([{ role: 'user', text: q }, { role: 'assistant', text: r.text, tools: r.toolCalls }])).slice(-40);
    res.json({ answer: r.text, tools: r.toolCalls });
  } catch (e) {
    console.error('AI:', e.message);
    res.status(500).json({ error: A.describeError(e) });
  }
});
router.post('/reset', (req, res) => { delete req.session.aiMessages; delete req.session.aiDisplay; res.json({ ok: true }); });
module.exports = router;
