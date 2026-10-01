// AI asistent: odpovedá na otázky o aplikácii a vyhľadáva faktúry, zákazky, hodinové lístky,
// klientov, pracovníkov, úlohy a bankové platby cez nástroje (tool use) Claude API.
const Anthropic = require('@anthropic-ai/sdk');
const { all, get, getSettings } = require('../db');
const U = require('../utils');
const INV = require('./invoices');
const R = require('./reports');

const DEFAULT_MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 20;      // počet správ (user+assistant) v pamäti rozhovoru
const MAX_TOOL_ROUNDS = 8;

function apiKey() { return getSettings().ai_api_key || process.env.ANTHROPIC_API_KEY || ''; }
function isConfigured() { return Boolean(apiKey()); }

// ---------- nástroje ----------
const like = (q) => '%' + String(q || '').trim() + '%';
const lim = (n, d = 10) => Math.min(Math.max(parseInt(n, 10) || d, 1), 50);

const TOOLS = [
  {
    name: 'search_invoices',
    description: 'Vyhľadá faktúry. Vracia číslo, klienta, dátumy, sumy, stav úhrady, zádržné a odkaz. Použi na otázky o faktúrach, úhradách, splatnosti, zádržnom a skonte.',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Číslo faktúry alebo časť názvu klienta (voliteľné)' },
      status: { type: 'string', enum: ['all', 'open', 'overdue', 'paid', 'retention'], description: 'open = neuhradené, overdue = po splatnosti, paid = uhradené, retention = otvorené zádržné' },
      from: { type: 'string', description: 'Dátum vystavenia od (YYYY-MM-DD)' },
      to: { type: 'string', description: 'Dátum vystavenia do (YYYY-MM-DD)' },
      limit: { type: 'integer' },
    } },
    run: (a) => {
      const params = []; let where = '1=1'; const today = U.today();
      if (a.query) { where += ' AND (i.number LIKE ? OR c.name LIKE ?)'; params.push(like(a.query), like(a.query)); }
      if (a.status === 'open') where += " AND i.status IN ('issued','partial')";
      else if (a.status === 'overdue') { where += " AND i.status IN ('issued','partial') AND i.due_date < ?"; params.push(today); }
      else if (a.status === 'paid') where += " AND i.status = 'paid'";
      else if (a.status === 'retention') where += " AND i.status != 'cancelled' AND i.retention_amount > i.retention_paid + 0.005";
      if (a.from) { where += ' AND i.issue_date >= ?'; params.push(a.from); }
      if (a.to) { where += ' AND i.issue_date <= ?'; params.push(a.to); }
      params.push(lim(a.limit));
      return all(`SELECT i.*, c.name AS client_name, s.name AS site_name FROM invoices i JOIN clients c ON c.id=i.client_id LEFT JOIN sites s ON s.id=i.site_id WHERE ${where} ORDER BY i.issue_date DESC, i.id DESC LIMIT ?`, params)
        .map((i) => ({ cislo: i.number, klient: i.client_name, zakazka: i.site_name, vystavena: i.issue_date, splatnost: i.due_date, suma_s_dph: i.total, k_uhrade: i.amount_due, uhradene: i.paid_amount, zostava: INV.remaining(i), stav: INV.invoiceStatusLabel(i).text, dni_po_splatnosti: INV.daysOverdue(i), zadrzne: i.retention_amount, zadrzne_zostava: INV.retentionRemaining(i), zadrzne_splatne: i.retention_due_date, skonto_percent: i.skonto_percent, skonto_uplatnene: !!i.skonto_applied, odkaz: `/invoices/${i.id}` }));
    },
  },
  {
    name: 'search_orders',
    description: 'Vyhľadá zákazky (stavby) klientov so stavom voľná / rozpracovaná / ukončená, sadzbou, počtom pracovníkov a nevyfakturovanými hodinami.',
    input_schema: { type: 'object', properties: {
      query: { type: 'string', description: 'Časť názvu zákazky, adresy alebo klienta' },
      status: { type: 'string', enum: ['all', 'open', 'active', 'finished'] },
      limit: { type: 'integer' },
    } },
    run: (a) => {
      const params = [U.addDays(U.weekStart(), -7)]; let where = '1=1';
      if (a.query) { where += ' AND (s.name LIKE ? OR s.address LIKE ? OR c.name LIKE ?)'; params.push(like(a.query), like(a.query), like(a.query)); }
      if (a.status && a.status !== 'all') { where += ' AND s.status = ?'; params.push(a.status); }
      params.push(lim(a.limit));
      const L = { open: 'voľná', active: 'rozpracovaná', finished: 'ukončená' };
      return all(`SELECT s.*, c.name AS client_name,
        (SELECT COUNT(DISTINCT r.worker_id) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.site_id=s.id AND t.week_start >= ?) AS workers_now,
        (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.site_id=s.id AND t.status='approved' AND r.invoice_id IS NULL) AS hours_uninvoiced
        FROM sites s JOIN clients c ON c.id=s.client_id WHERE ${where} ORDER BY CASE s.status WHEN 'active' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, s.name LIMIT ?`, params)
        .map((s) => ({ nazov: s.name, klient: s.client_name, stav: L[s.status] || s.status, adresa: s.address, sadzba_eur_h: s.hourly_rate, zaciatok: s.start_date, koniec: s.end_date, pracovnici_teraz: s.workers_now, pracovnici_potrebni: s.workers_needed, nevyfakturovane_hodiny: s.hours_uninvoiced, kontakt: s.contact_person, odkaz: `/orders/${s.id}` }));
    },
  },
  {
    name: 'search_timesheets',
    description: 'Vyhľadá hodinové lístky (týždne) podľa dátumu, zákazky, klienta alebo pracovníka. Vracia týždeň, stavbu, počet pracovníkov, hodiny a stav (rozpracovaný / schválený / vyfakturovaný).',
    input_schema: { type: 'object', properties: {
      date: { type: 'string', description: 'Ľubovoľný deň v hľadanom týždni (YYYY-MM-DD)' },
      from: { type: 'string', description: 'Začiatok obdobia (YYYY-MM-DD)' },
      to: { type: 'string', description: 'Koniec obdobia (YYYY-MM-DD)' },
      query: { type: 'string', description: 'Časť názvu zákazky, klienta alebo meno pracovníka' },
      status: { type: 'string', enum: ['all', 'draft', 'approved', 'invoiced'] },
      limit: { type: 'integer' },
    } },
    run: (a) => {
      const params = []; let where = '1=1';
      if (a.date) { where += ' AND t.week_start = ?'; params.push(U.weekStart(a.date)); }
      if (a.from) { where += ' AND t.week_start >= ?'; params.push(U.weekStart(a.from)); }
      if (a.to) { where += ' AND t.week_start <= ?'; params.push(a.to); }
      if (a.query) { where += ' AND (s.name LIKE ? OR c.name LIKE ? OR EXISTS (SELECT 1 FROM timesheet_rows r JOIN workers w ON w.id=r.worker_id WHERE r.timesheet_id=t.id AND (w.first_name LIKE ? OR w.last_name LIKE ?)))'; params.push(like(a.query), like(a.query), like(a.query), like(a.query)); }
      if (a.status && a.status !== 'all') { where += ' AND t.status = ?'; params.push(a.status); }
      params.push(lim(a.limit));
      const L = { draft: 'rozpracovaný', approved: 'schválený', invoiced: 'vyfakturovaný' };
      return all(`SELECT t.*, s.name AS site_name, c.name AS client_name,
        (SELECT COUNT(*) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS workers,
        (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r WHERE r.timesheet_id=t.id) AS hours,
        (SELECT GROUP_CONCAT(w.last_name || ' ' || w.first_name || ' (' || (r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7) || ' h)', ', ') FROM timesheet_rows r JOIN workers w ON w.id=r.worker_id WHERE r.timesheet_id=t.id) AS workers_list
        FROM timesheets t JOIN sites s ON s.id=t.site_id JOIN clients c ON c.id=s.client_id WHERE ${where} ORDER BY t.week_start DESC LIMIT ?`, params)
        .map((t) => { const wk = U.isoWeek(t.week_start); return { tyzden: `T${wk.week}/${wk.year}`, od: t.week_start, do: U.addDays(t.week_start, 6), zakazka: t.site_name, klient: t.client_name, stav: L[t.status], pocet_pracovnikov: t.workers, hodiny: t.hours, pracovnici: t.workers_list, odkaz: `/timesheets/${t.id}` }; });
    },
  },
  {
    name: 'search_clients',
    description: 'Vyhľadá klientov (odberateľov) s platobnými podmienkami a otvorenými pohľadávkami.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } } },
    run: (a) => all(`SELECT c.*, (SELECT COALESCE(SUM(amount_due - paid_amount),0) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('issued','partial')) AS open_amount, (SELECT COUNT(*) FROM sites s WHERE s.client_id=c.id AND s.status != 'finished') AS sites FROM clients c WHERE c.name LIKE ? OR c.ico LIKE ? OR c.contact_person LIKE ? ORDER BY c.name LIMIT ?`, [like(a.query), like(a.query), like(a.query), lim(a.limit)])
      .map((c) => ({ nazov: c.name, ico: c.ico, email: c.email, kontakt: c.contact_person, telefon: c.phone, splatnost_dni: c.due_days, zadrzne_percent: c.retention_percent, zadrzne_mesiace: c.retention_months, skonto_percent: c.skonto_percent, skonto_dni: c.skonto_days, otvorene_pohladavky: U.round2(c.open_amount), aktivne_zakazky: c.sites, odkaz: `/clients/${c.id}` })),
  },
  {
    name: 'search_workers',
    description: 'Vyhľadá pracovníkov (meno, národnosť, profesia, sadzby, odpracované hodiny za posledných 30 dní).',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } } },
    run: (a) => all(`SELECT w.*, (SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE r.worker_id=w.id AND t.week_start >= ?) AS hours30,
      (SELECT s.name FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id JOIN sites s ON s.id=t.site_id WHERE r.worker_id=w.id ORDER BY t.week_start DESC LIMIT 1) AS last_site
      FROM workers w WHERE w.first_name LIKE ? OR w.last_name LIKE ? OR w.position LIKE ? OR w.nationality LIKE ? ORDER BY w.last_name LIMIT ?`, [U.addDays(U.today(), -30), like(a.query), like(a.query), like(a.query), like(a.query), lim(a.limit)])
      .map((w) => ({ meno: `${w.last_name} ${w.first_name}`, narodnost: w.nationality, profesia: w.position, telefon: w.phone, aktivny: !!w.active, nakladova_sadzba: w.hourly_cost, fakturacna_sadzba: w.hourly_rate, hodiny_30_dni: w.hours30, posledna_zakazka: w.last_site, odkaz: `/workers/${w.id}/edit` })),
  },
  {
    name: 'search_tasks',
    description: 'Vyhľadá úlohy (čo treba urobiť, kto zadal, kto rieši, stav, termín).',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, status: { type: 'string', enum: ['all', 'open', 'done', 'overdue'] }, limit: { type: 'integer' } } },
    run: (a) => {
      const params = []; let where = '1=1';
      if (a.query) { where += ' AND (t.title LIKE ? OR t.description LIKE ? OR ut.name LIKE ? OR ut.username LIKE ?)'; params.push(like(a.query), like(a.query), like(a.query), like(a.query)); }
      if (a.status === 'open') where += " AND t.status IN ('new','progress','waiting')";
      else if (a.status === 'done') where += " AND t.status IN ('done','cancelled')";
      else if (a.status === 'overdue') { where += " AND t.status IN ('new','progress','waiting') AND t.due_date < ?"; params.push(U.today()); }
      params.push(lim(a.limit));
      const L = { new: 'nová', progress: 'rozpracovaná', waiting: 'čaká sa', done: 'hotová', cancelled: 'zrušená' };
      return all(`SELECT t.*, ub.name AS by_name, ub.username AS by_user, ut.name AS to_name, ut.username AS to_user, s.name AS site_name FROM tasks t LEFT JOIN users ub ON ub.id=t.assigned_by LEFT JOIN users ut ON ut.id=t.assigned_to LEFT JOIN sites s ON s.id=t.site_id WHERE ${where} ORDER BY COALESCE(t.due_date,'9999'), t.id DESC LIMIT ?`, params)
        .map((t) => ({ uloha: t.title, popis: t.description, stav: L[t.status], priorita: t.priority, zadal: t.by_name || t.by_user, riesi: t.to_name || t.to_user, termin: t.due_date, zakazka: t.site_name, odkaz: `/tasks/${t.id}` }));
    },
  },
  {
    name: 'search_bank_transactions',
    description: 'Vyhľadá bankové transakcie z importovaných výpisov (spárované / nespárované platby).',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Protistrana, VS alebo text správy' }, status: { type: 'string', enum: ['all', 'unmatched', 'matched', 'ignored'] }, limit: { type: 'integer' } } },
    run: (a) => {
      const params = []; let where = '1=1';
      if (a.query) { where += ' AND (b.counterparty_name LIKE ? OR b.variable_symbol LIKE ? OR b.message LIKE ?)'; params.push(like(a.query), like(a.query), like(a.query)); }
      if (a.status === 'unmatched') where += " AND b.match_status = 'unmatched' AND b.amount > 0";
      else if (a.status === 'matched') where += " AND b.match_status IN ('auto','manual')";
      else if (a.status === 'ignored') where += " AND b.match_status = 'ignored'";
      params.push(lim(a.limit));
      return all(`SELECT b.*, i.number AS invoice_number FROM bank_transactions b LEFT JOIN invoices i ON i.id=b.matched_invoice_id WHERE ${where} ORDER BY b.date DESC LIMIT ?`, params)
        .map((b) => ({ datum: b.date, suma: b.amount, protistrana: b.counterparty_name, vs: b.variable_symbol, sprava: b.message, stav: b.match_status, faktura: b.invoice_number, odkaz: `/bank/${b.id}` }));
    },
  },
  {
    name: 'get_overview',
    description: 'Vráti aktuálny prehľad firmy: tržby, náklady a zisk za tento mesiac, pohľadávky, faktúry po splatnosti, nespárované platby, nevyfakturované hodiny, otvorené úlohy a zákazky.',
    input_schema: { type: 'object', properties: {} },
    run: () => {
      const today = U.today(); const from = U.monthStart(today), to = U.monthEnd(today);
      const rev = R.revenue(from, to), exp = R.expenses(from, to), lab = R.laborCost(from, to);
      const laborEff = exp.wagesNet > 0 ? 0 : lab.cost;
      const open = all("SELECT * FROM invoices WHERE status IN ('issued','partial')");
      return {
        mesiac: today.slice(0, 7), trzby_bez_dph: rev.net, pocet_faktur: rev.count, naklady: exp.net, mzdy_z_hodin: lab.cost, zisk: U.round2(rev.net - exp.net - laborEff), odpracovane_hodiny: lab.hours,
        pohladavky: U.round2(open.reduce((s, i) => s + INV.remaining(i), 0)), po_splatnosti: U.round2(open.filter(INV.isOverdue).reduce((s, i) => s + INV.remaining(i), 0)), pocet_po_splatnosti: open.filter(INV.isOverdue).length,
        otvorene_zadrzne: U.round2(all("SELECT * FROM invoices WHERE status != 'cancelled'").reduce((s, i) => s + INV.retentionRemaining(i), 0)),
        nesparovane_platby: get("SELECT COUNT(*) AS n FROM bank_transactions WHERE match_status='unmatched' AND amount > 0").n,
        nevyfakturovane_hodiny: get("SELECT COALESCE(SUM(r.d1+r.d2+r.d3+r.d4+r.d5+r.d6+r.d7),0) AS h FROM timesheet_rows r JOIN timesheets t ON t.id=r.timesheet_id WHERE t.status='approved' AND r.invoice_id IS NULL").h,
        neschvalene_listky: get("SELECT COUNT(*) AS n FROM timesheets WHERE status='draft'").n,
        otvorene_ulohy: get("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('new','progress','waiting')").n,
        zakazky_volne: get("SELECT COUNT(*) AS n FROM sites WHERE status='open'").n, zakazky_rozpracovane: get("SELECT COUNT(*) AS n FROM sites WHERE status='active'").n,
        aktivni_pracovnici: get('SELECT COUNT(*) AS n FROM workers WHERE active=1').n,
      };
    },
  },
];

function runTool(name, input) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { error: 'Neznámy nástroj ' + name };
  try { return t.run(input || {}); } catch (e) { return { error: e.message }; }
}

// ---------- systémový prompt ----------
const APP_GUIDE = `Si AI asistent firemnej aplikácie personálnej agentúry v stavebníctve (prenájom pracovníkov na stavby). Odpovedáš po slovensky, stručne a prakticky.

Sekcie aplikácie a ich adresy:
- /  Prehľad: KPI za mesiac, faktúry po splatnosti, nespárované platby, zádržné, moje úlohy.
- /tasks  Úlohy: kto komu čo zadal, stav (nová, rozpracovaná, čaká sa, hotová), termín, komentáre. Nová úloha: /tasks/new.
- /orders  Zákazky (stavby): stav voľná / rozpracovaná / ukončená, sadzba €/h, potrebný počet pracovníkov. Nová: /orders/new.
- /timesheets  Hodinové lístky: jeden lístok = zákazka + týždeň (Po–Ne), pracovníci ako riadky. Postup: vybrať stavbu a dátum → Otvoriť/vytvoriť lístok → pridať pracovníkov → zapísať hodiny → Uložiť a schváliť. Schválené hodiny sa dajú fakturovať; vyfakturovaný lístok sa nedá upravovať.
- /workers  Pracovníci: nákladová sadzba (mzda+odvody) a voliteľná fakturačná sadzba.
- /clients  Klienti: IČO, e-mail, splatnosť, zádržné %, skonto %, prenesenie daňovej povinnosti. Zákazky klienta sú v detaile klienta.
- /invoices  Fakturácia: zoznam faktúr so stavom úhrady a zádržným. Fakturovať hodiny: /invoices/from-timesheets (vyberie schválené nevyfakturované lístky klienta za obdobie). Ručná faktúra: /invoices/new. Detail faktúry: tlač/PDF, ručná úhrada, upomienka, storno.
- /bank  Banka a platby: import výpisov (camt.053 XML alebo CSV) ručne alebo automaticky z e-mailu (IMAP), automatické párovanie podľa VS a sumy, ručné párovanie, ignorovanie, náklad z odchádzajúcej platby.
- /expenses  Náklady: kategórie, DPH, opakujúce sa mesačné náklady.
- /reports  Zisk a prehľady: mesačný zisk = tržby bez DPH − náklady − mzdy z hodín; ziskovosť podľa zákaziek a pracovníkov.
- /settings  Nastavenia: záložky Firma, Fakturácia (číslovanie, DPH), Upomienky (dni po splatnosti, text, automatické odosielanie o 8:00), Odosielanie e-mailov (SMTP), Bankový e-mail (IMAP), Účet a používatelia, AI asistent, Denník.

Pojmy: skonto = zľava za úhradu v lehote (uzná sa automaticky pri úhrade v lehote). Zádržné = časť faktúry, ktorú klient zadrží a vyplatí neskôr (sleduje sa jeho splatnosť). Upomienky sa posielajú po X dňoch po splatnosti (predvolene 3, 14, 30), každý stupeň raz.

Pravidlá odpovedí:
- Na otázky o konkrétnych dátach (faktúry, zákazky, týždne, pracovníci, úlohy, platby, prehľad) VŽDY použi nástroje; nehádaj. Ak nástroj nič nenájde, povedz to.
- Odkazy uvádzaj vo formáte markdown [text](/cesta) presne tak, ako ich vrátil nástroj. Sumy píš v eurách s dvoma desatinnými miestami, dátumy vo formáte DD.MM.RRRR.
- Pri návode na používanie popíš kroky v číslovanom zozname a uveď odkaz na sekciu.
- Nemeníš dáta, iba vyhľadávaš a radíš. Ak používateľ chce niečo zmeniť, povedz, kde to v aplikácii urobí.
- Odpovedaj krátko; na zoznamy použi odrážky.`;

function systemPrompt(user) {
  const s = getSettings();
  return [
    { type: 'text', text: APP_GUIDE, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Firma: ${s.company_name}. Dnešný dátum: ${U.today()}. Prihlásený používateľ: ${user ? (user.name || user.username) : 'neznámy'}.` },
  ];
}

// ---------- hlavné volanie ----------
async function ask({ history = [], question, user }) {
  const key = apiKey();
  if (!key) throw new Error('AI asistent nie je nastavený. Zadajte API kľúč v Nastavenia → AI asistent.');
  const s = getSettings();
  const client = new Anthropic({ apiKey: key });
  const model = s.ai_model || DEFAULT_MODEL;
  const messages = history.slice(-MAX_HISTORY).concat([{ role: 'user', content: question }]);
  const tools = TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
  const toolCalls = [];
  let response;
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const req = {
      model, max_tokens: 8000,
      system: systemPrompt(user),
      output_config: { effort: 'low' },
      tools, messages,
    };
    if (/^claude-(opus-5|fable|sonnet-5-5)/.test(model)) { req.betas = ['server-side-fallback-2026-07-01']; req.fallbacks = 'default'; }
    response = req.betas ? await client.beta.messages.create(req) : await client.messages.create(req);
    if (response.stop_reason === 'refusal') {
      return { text: 'Na túto otázku nemôžem odpovedať.', toolCalls, messages: messages.concat([{ role: 'assistant', content: response.content }]) };
    }
    messages.push({ role: 'assistant', content: response.content });
    if (response.stop_reason === 'pause_turn') continue;
    if (response.stop_reason !== 'tool_use') break;
    const uses = response.content.filter((b) => b.type === 'tool_use');
    const results = uses.map((u) => {
      const out = runTool(u.name, u.input);
      toolCalls.push({ name: u.name, input: u.input, count: Array.isArray(out) ? out.length : 1 });
      return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out) };
    });
    messages.push({ role: 'user', content: results });
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  return { text: text || 'Nenašiel som odpoveď.', toolCalls, messages, usage: response.usage };
}

// Preklad chýb SDK na zrozumiteľnú správu
function describeError(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'Neplatný API kľúč (Nastavenia → AI asistent).';
  if (e instanceof Anthropic.RateLimitError) return 'Prekročený limit požiadaviek, skúste o chvíľu.';
  if (e instanceof Anthropic.NotFoundError) return 'Model neexistuje alebo nie je dostupný: skontrolujte názov modelu v nastaveniach.';
  if (e instanceof Anthropic.APIError) return `Chyba AI služby (${e.status}): ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Nepodarilo sa pripojiť k AI službe (sieť).';
  return e.message;
}

async function testConnection() {
  const key = apiKey();
  if (!key) throw new Error('Chýba API kľúč.');
  const client = new Anthropic({ apiKey: key });
  const r = await client.messages.create({ model: getSettings().ai_model || DEFAULT_MODEL, max_tokens: 256, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Odpovedz jedným slovom: OK' }] });
  return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

module.exports = { ask, runTool, TOOLS, isConfigured, describeError, testConnection, DEFAULT_MODEL, APP_GUIDE };
