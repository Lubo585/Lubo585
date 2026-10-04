// Generovanie PDF (faktúra, ponuka, výplatná páska) pomocou pdfkit s písmom DejaVu (diakritika)
const PDFDocument = require('pdfkit');
const path = require('path');
const { getSettings } = require('../db');
const U = require('../utils');
const { t: T } = require('./i18n');
const FONT = path.join(__dirname, '..', '..', 'public', 'fonts', 'DejaVuSans.ttf');
const FONT_B = path.join(__dirname, '..', '..', 'public', 'fonts', 'DejaVuSans-Bold.ttf');

function render(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Producer: 'Agentura app' } });
    const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    doc.registerFont('R', FONT); doc.registerFont('B', FONT_B); doc.font('R');
    build(doc); doc.end();
  });
}
const money = (n) => U.money(n, '€');

function invoicePdf(inv) {
  const s = getSettings(); const L = T(inv.language || 'sk');
  return render((doc) => {
    const W = doc.page.width - 80;
    doc.font('B').fontSize(18).text(`${L.invoice} ${inv.number}`, 40, 40);
    doc.font('R').fontSize(9).fillColor('#555').text(`${L.vs}: ${inv.variable_symbol || inv.number}`);
    doc.fillColor('#000').font('B').fontSize(10).text(s.company_name, 330, 40, { width: 225, align: 'right' }).font('R').fontSize(8).text(s.company_address || '', { width: 225, align: 'right' });
    // bloky dodávateľ / odberateľ
    const y0 = 90;
    const box = (x, y, w, h, title, lines) => { doc.roundedRect(x, y, w, h, 4).strokeColor('#bbb').stroke(); doc.font('B').fontSize(7).fillColor('#666').text(title.toUpperCase(), x + 8, y + 6); doc.fillColor('#000').font('R').fontSize(9); let yy = y + 18; for (const [ln, bold] of lines) { if (!ln) continue; doc.font(bold ? 'B' : 'R').text(ln, x + 8, yy, { width: w - 16 }); yy += doc.heightOfString(ln, { width: w - 16 }) + 1; } };
    box(40, y0, W / 2 - 6, 96, L.supplier, [[s.company_name, true], [s.company_address], [`${L.ico}: ${s.company_ico}   ${L.dic}: ${s.company_dic}`], [s.company_ic_dph ? `${L.vatid}: ${s.company_ic_dph}` : ''], [s.company_register || ''], [s.aug_permit_number && inv.language === 'de' ? `${L.aug} ${s.aug_permit_number}` : '']]);
    box(40 + W / 2 + 6, y0, W / 2 - 6, 96, L.customer, [[inv.client_name, true], [inv.client_address || ''], [`${L.ico}: ${inv.client_ico || ''}   ${L.dic}: ${inv.client_dic || ''}`], [inv.client_ic_dph ? `${L.vatid}: ${inv.client_ic_dph}` : ''], [inv.client_register || ''], [inv.client_customer_number ? `Kundennr.: ${inv.client_customer_number}` : '']]);
    const y1 = y0 + 104;
    box(40, y1, W / 2 - 6, 74, L.dates, [[`${L.issue}: ${U.fmtDate(inv.issue_date)}`], [`${L.delivery}: ${U.fmtDate(inv.delivery_date || inv.issue_date)}`], [`${L.due}: ${U.fmtDate(inv.due_date)}`, true], [inv.period_from ? `${L.period}: ${U.fmtDate(inv.period_from)} – ${U.fmtDate(inv.period_to)}` : ''], [inv.site_name ? `${L.site}: ${inv.site_name}` : '']]);
    box(40 + W / 2 + 6, y1, W / 2 - 6, 74, L.payment, [[`${L.iban}: ${s.company_iban}`, true], [s.company_bic ? `${L.bic}: ${s.company_bic}` : ''], [`${L.reference}: ${inv.variable_symbol || inv.number}`], [`${L.method}: ${L.transfer}`]]);
    // položky
    let y = y1 + 90;
    const cols = [{ k: 'desc', w: 265, a: 'left' }, { k: 'qty', w: 60, a: 'right' }, { k: 'unit', w: 40, a: 'left' }, { k: 'price', w: 75, a: 'right' }, { k: 'total', w: 75, a: 'right' }];
    const row = (vals, bold, bg) => {
      let x = 40; const h = Math.max(...vals.map((v, i) => doc.heightOfString(String(v), { width: cols[i].w - 8 }))) + 8;
      if (y + h > doc.page.height - 80) { doc.addPage(); y = 40; }
      if (bg) doc.rect(40, y, W, h).fill('#f3f4f6').fillColor('#000');
      doc.font(bold ? 'B' : 'R').fontSize(8.5);
      vals.forEach((v, i) => { doc.text(String(v), x + 4, y + 4, { width: cols[i].w - 8, align: cols[i].a }); x += cols[i].w; });
      doc.moveTo(40, y + h).lineTo(40 + W, y + h).strokeColor('#ddd').stroke(); y += h;
    };
    row([L.desc, L.qty, L.unit, L.price, L.total], true, true);
    for (const it of inv.items) row([it.description, U.hours(it.quantity), it.unit, money(it.unit_price), money(it.total)]);
    y += 8;
    const tot = (label, val, bold) => { if (y > doc.page.height - 80) { doc.addPage(); y = 40; } doc.font(bold ? 'B' : 'R').fontSize(bold ? 11 : 9).text(label, 300, y, { width: 150 }).text(val, 450, y, { width: 105, align: 'right' }); y += bold ? 18 : 14; };
    tot(L.net, money(inv.subtotal));
    if (inv.vat_mode === 'standard') tot(`${L.vat} ${inv.vat_rate} %`, money(inv.vat_amount)); else tot(L.vat, inv.vat_mode === 'exempt' ? '–' : 'Reverse charge');
    tot(L.gross, money(inv.total), false);
    for (const f of inv.fees) tot(f.name, money(f.amount));
    if (inv.retention_amount) tot(`${L.retention} ${inv.retention_percent} %${inv.retention_due_date ? ' (' + L.retention_due + ' ' + U.fmtDate(inv.retention_due_date) + ')' : ''}`, '− ' + money(inv.retention_amount));
    if (inv.withholding_amount) tot(L.withholding, '− ' + money(inv.withholding_amount));
    doc.moveTo(300, y).lineTo(555, y).strokeColor('#000').stroke(); y += 4;
    tot(L.due_amount, money(inv.amount_due), true);
    y += 6; doc.font('R').fontSize(8.5);
    const note = (txt) => { if (!txt) return; if (y > doc.page.height - 80) { doc.addPage(); y = 40; } doc.text(txt, 40, y, { width: W }); y += doc.heightOfString(txt, { width: W }) + 4; };
    if (inv.vat_mode === 'eu_reverse') note(L.rc_eu); if (inv.vat_mode === 'domestic_reverse') note(L.rc_domestic); if (inv.vat_mode === 'exempt') note(L.exempt);
    if (inv.skonto_percent) note(L.skonto(U.fmtDate(U.addDays(inv.issue_date, inv.skonto_days)), inv.skonto_percent, money(inv.amount_due - inv.skonto_amount)));
    if (inv.retention_amount) note(L.retention_note(money(inv.retention_amount), inv.retention_due_date ? U.fmtDate(inv.retention_due_date) : '–'));
    note(inv.client_payment_note); note(inv.note);
    y += 20; doc.fontSize(8).fillColor('#666').text(`${L.issued_by}: ${inv.issued_by || ''}`, 40, y).text(`${L.stamp}: ______________________`, 330, y, { width: 225, align: 'right' });
  });
}
function quotePdf(q) {
  const s = getSettings(); const L = T(q.language || 'sk');
  return render((doc) => {
    const W = doc.page.width - 80;
    doc.font('B').fontSize(18).text(`${L.quote} ${q.number}`, 40, 40);
    doc.font('R').fontSize(9).fillColor('#555').text(`${U.fmtDate(q.date)}${q.valid_until ? ' · ' + L.valid_until + ' ' + U.fmtDate(q.valid_until) : ''}`);
    doc.fillColor('#000').font('B').fontSize(10).text(s.company_name, 330, 40, { width: 225, align: 'right' }).font('R').fontSize(8).text(s.company_address || '', { width: 225, align: 'right' }).text(`${L.ico}: ${s.company_ico}  ${L.vatid}: ${s.company_ic_dph}`, { width: 225, align: 'right' });
    doc.fontSize(9).text(`${L.customer}: `, 40, 100).font('B').text(q.client_name, 110, 100).font('R').text(q.client_address || '', 110, 112);
    doc.text(L.quote_intro, 40, 140, { width: W });
    let y = 165;
    doc.rect(40, y, W, 16).fill('#f3f4f6').fillColor('#000').font('B').fontSize(8.5).text(L.desc, 44, y + 4).text(L.qty, 310, y + 4, { width: 60, align: 'right' }).text(L.unit, 375, y + 4).text(L.price, 420, y + 4, { width: 60, align: 'right' }).text(L.total, 485, y + 4, { width: 70, align: 'right' }); y += 18;
    doc.font('R');
    for (const it of q.items) { const h = doc.heightOfString(it.description, { width: 260 }) + 6; doc.text(it.description, 44, y + 3, { width: 260 }).text(U.hours(it.quantity), 310, y + 3, { width: 60, align: 'right' }).text(it.unit, 375, y + 3).text(money(it.unit_price), 420, y + 3, { width: 60, align: 'right' }).text(money(it.total), 485, y + 3, { width: 70, align: 'right' }); y += h; doc.moveTo(40, y).lineTo(40 + W, y).strokeColor('#ddd').stroke(); }
    y += 8; doc.font('B').fontSize(11).text(`${L.net}: ${money(q.subtotal)}`, 300, y, { width: 255, align: 'right' }); y += 24;
    doc.font('R').fontSize(8.5).text(L.quote_terms, 40, y, { width: W }); y += 30; if (q.note) doc.text(q.note, 40, y, { width: W });
  });
}
module.exports = { invoicePdf, quotePdf, render };
