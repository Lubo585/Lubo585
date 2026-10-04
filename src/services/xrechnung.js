// Export faktúry do XRechnung (UBL 2.1, EN 16931) – základná štruktúra pre nemeckých odberateľov
const { getSettings } = require('../db');
const U = require('../utils');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (n) => U.round2(n).toFixed(2);

function invoiceXml(inv) {
  const s = getSettings();
  const taxCat = inv.vat_mode === 'standard' ? { id: 'S', rate: inv.vat_rate, reason: '' } : inv.vat_mode === 'eu_reverse' ? { id: 'AE', rate: 0, reason: 'Reverse charge' } : inv.vat_mode === 'domestic_reverse' ? { id: 'AE', rate: 0, reason: 'Reverse charge' } : { id: 'E', rate: 0, reason: 'Exempt' };
  const lines = inv.items.map((it, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${it.unit === 'hod' || it.unit === 'Std.' ? 'HUR' : 'C62'}">${n2(it.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="EUR">${n2(it.total)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${esc(it.description)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${taxCat.id}</cbc:ID><cbc:Percent>${n2(taxCat.rate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="EUR">${n2(it.unit_price)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join('');
  const charges = inv.fees.filter((f) => f.amount > 0).map((f) => `
    <cac:AllowanceCharge><cbc:ChargeIndicator>true</cbc:ChargeIndicator><cbc:AllowanceChargeReason>${esc(f.name)}</cbc:AllowanceChargeReason><cbc:Amount currencyID="EUR">${n2(f.amount)}</cbc:Amount><cac:TaxCategory><cbc:ID>${taxCat.id}</cbc:ID><cbc:Percent>${n2(taxCat.rate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:AllowanceCharge>`).join('');
  const allowances = inv.fees.filter((f) => f.amount < 0).map((f) => `
    <cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>${esc(f.name)}</cbc:AllowanceChargeReason><cbc:Amount currencyID="EUR">${n2(-f.amount)}</cbc:Amount><cac:TaxCategory><cbc:ID>${taxCat.id}</cbc:ID><cbc:Percent>${n2(taxCat.rate)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:AllowanceCharge>`).join('');
  const notes = [inv.vat_mode === 'eu_reverse' ? 'Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).' : '', inv.retention_amount ? `Sicherheitseinbehalt ${inv.retention_percent} %: ${n2(inv.retention_amount)} EUR, fällig ${inv.retention_due_date ? U.fmtDate(inv.retention_due_date) : ''}` : '', inv.withholding_amount ? `Bauabzugsteuer 15 %: ${n2(inv.withholding_amount)} EUR` : '', inv.skonto_percent ? `Skonto ${inv.skonto_percent} % bei Zahlung bis ${U.fmtDate(U.addDays(inv.issue_date, inv.skonto_days))}` : '', inv.note || ''].filter(Boolean);
  const party = (name, address, country, ico, vat, register) => `
      <cac:Party>
        <cac:PartyName><cbc:Name>${esc(name)}</cbc:Name></cac:PartyName>
        <cac:PostalAddress><cbc:StreetName>${esc((address || '').split(',')[0])}</cbc:StreetName><cbc:CityName>${esc(((address || '').split(',')[1] || '').trim())}</cbc:CityName><cac:Country><cbc:IdentificationCode>${esc(country)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
        ${vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
        <cac:PartyLegalEntity><cbc:RegistrationName>${esc(name)}</cbc:RegistrationName>${ico ? `<cbc:CompanyID>${esc(ico)}</cbc:CompanyID>` : ''}${register ? `<cbc:CompanyLegalForm>${esc(register)}</cbc:CompanyLegalForm>` : ''}</cac:PartyLegalEntity>
      </cac:Party>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(inv.number)}</cbc:ID>
  <cbc:IssueDate>${inv.issue_date}</cbc:IssueDate>
  <cbc:DueDate>${inv.due_date}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  ${notes.map((n) => `<cbc:Note>${esc(n)}</cbc:Note>`).join('\n  ')}
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${esc(inv.client_customer_number || inv.client_name)}</cbc:BuyerReference>
  ${inv.period_from ? `<cac:InvoicePeriod><cbc:StartDate>${inv.period_from}</cbc:StartDate><cbc:EndDate>${inv.period_to}</cbc:EndDate></cac:InvoicePeriod>` : ''}
  <cac:AccountingSupplierParty>${party(s.company_name, s.company_address, s.company_country || 'SK', s.company_ico, s.company_ic_dph, s.company_register)}</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${party(inv.client_name, inv.client_address, inv.client_country || 'DE', inv.client_ico, inv.client_ic_dph, inv.client_register)}</cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode><cbc:PaymentID>${esc(inv.variable_symbol || inv.number)}</cbc:PaymentID><cac:PayeeFinancialAccount><cbc:ID>${esc(s.company_iban)}</cbc:ID><cbc:Name>${esc(s.company_name)}</cbc:Name>${s.company_bic ? `<cac:FinancialInstitutionBranch><cbc:ID>${esc(s.company_bic)}</cbc:ID></cac:FinancialInstitutionBranch>` : ''}</cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:PaymentTerms><cbc:Note>${esc(`Zahlbar bis ${U.fmtDate(inv.due_date)}`)}</cbc:Note></cac:PaymentTerms>${charges}${allowances}
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${n2(inv.vat_amount)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${n2(inv.subtotal + inv.fees_total)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${n2(inv.vat_amount)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${taxCat.id}</cbc:ID><cbc:Percent>${n2(taxCat.rate)}</cbc:Percent>${taxCat.reason ? `<cbc:TaxExemptionReason>${taxCat.reason}</cbc:TaxExemptionReason>` : ''}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${n2(inv.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${n2(inv.subtotal + inv.fees_total)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${n2(inv.total + inv.fees_total)}</cbc:TaxInclusiveAmount>
    ${inv.fees.some((f) => f.amount > 0) ? `<cbc:ChargeTotalAmount currencyID="EUR">${n2(inv.fees.filter((f) => f.amount > 0).reduce((a, f) => a + f.amount, 0))}</cbc:ChargeTotalAmount>` : ''}
    ${inv.fees.some((f) => f.amount < 0) ? `<cbc:AllowanceTotalAmount currencyID="EUR">${n2(-inv.fees.filter((f) => f.amount < 0).reduce((a, f) => a + f.amount, 0))}</cbc:AllowanceTotalAmount>` : ''}
    <cbc:PayableAmount currencyID="EUR">${n2(inv.total + inv.fees_total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</ubl:Invoice>`;
}
module.exports = { invoiceXml };
