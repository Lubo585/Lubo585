import { describe, expect, it } from 'vitest'
import { DEMO_PARAMS } from '../data/demo'
import { createProject } from '../data/templates'
import { apartmentPrice, basePerM2For, boqTotals, breakevenPriceDelta, compute, irrAnnual, listPrice, minEquity, parkingTotal, sellableArea, NO_ADJ } from './calc'

const TODAY = '2026-11-15'
const base = () => createProject({ ...DEMO_PARAMS, startMonth: '2026-11' }, TODAY)
const run = (d = base(), adj = NO_ADJ) => compute(d, adj, { today: TODAY })

describe('jednotky a ceny', () => {
  it('predajná plocha váži exteriéry koeficientmi', () => {
    const d = base()
    const u = d.units[0]
    expect(sellableArea(u, d.settings)).toBeCloseTo(82 + 16 * 0.5 + 90 * 0.1, 6)
  })

  it('cenníková cena sa zaokrúhľuje a rešpektuje ručný režim', () => {
    const d = base()
    const u = d.units[0]
    expect(listPrice(u, d.settings) % d.settings.pricing.roundTo).toBe(0)
    expect(listPrice({ ...u, priceMode: 'manual', manualPrice: 123456 }, d.settings)).toBe(123456)
  })

  it('cena bytu = predajná plocha × základná cena × príplatok podlažia, zaokrúhlená', () => {
    const d = base()
    d.settings.pricing = { ...d.settings.pricing, basePerM2: 4500, floorAdjPct: [0, 2, 4], roundTo: 500 }
    d.settings.areaCoef = { coveredTerrace: 0.5, loggia: 0.75, roofTerrace: 0.25, garden: 0.1 }
    const unit = { ...d.units[0], floor: 2, interior: 60.12, coveredTerrace: 11.72, loggia: 2, roofTerrace: 89.47, garden: 0 }
    // 60,12 + 5,86 + 1,50 + 22,3675 = 89,8475 m² → × 4 500 × 1,04 = 420 486,30 → 420 500
    expect(sellableArea(unit, d.settings)).toBeCloseTo(89.8475, 6)
    expect(apartmentPrice(unit, d.settings)).toBe(420_500)
  })

  it('parkovanie sa kupuje k bytu zvlášť: cenu bytu ani cenu za m² nemení', () => {
    const d = base()
    const before = run(d)
    const paid = base()
    paid.settings.pricing.parkingPrice = 10_000
    const after = run(paid)
    const spaces = paid.units.reduce((a, u) => a + u.parking, 0)
    expect(spaces).toBeGreaterThan(0)
    for (const [i, u] of after.units.entries()) {
      expect(u.apartment).toBe(before.units[i].apartment)
      expect(u.parking).toBe(u.unit.parking * 10_000)
      expect(u.list).toBe(u.apartment + u.parking)
    }
    expect(after.revenue.avgPerM2).toBeCloseTo(before.revenue.avgPerM2, 6)
    expect(after.revenue.parkingList).toBe(spaces * 10_000)
    expect(after.revenue.parkingSpaces).toBe(spaces)
    expect(after.revenue.listGross).toBe(before.revenue.listGross + spaces * 10_000)
    // voľné byty sa predajú za cenník – tržby rastú presne o cenu parkovacích miest
    expect(after.revenue.gross).toBeCloseTo(before.revenue.gross + spaces * 10_000, 4)
  })

  it('parkovanie sa pripočíta aj k ručne zadanej cene bytu a pri byte bez miesta sa neúčtuje', () => {
    const d = base()
    d.settings.pricing.parkingPrice = 10_000
    const u = d.units[0]
    expect(apartmentPrice({ ...u, priceMode: 'manual', manualPrice: 250_000 }, d.settings)).toBe(250_000)
    expect(listPrice({ ...u, priceMode: 'manual', manualPrice: 250_000, parking: 1 }, d.settings)).toBe(260_000)
    expect(listPrice({ ...u, parking: 2 }, d.settings)).toBe(apartmentPrice(u, d.settings) + 20_000)
    expect(parkingTotal({ ...u, parking: 0 }, d.settings)).toBe(0)
    expect(listPrice({ ...u, parking: 0 }, d.settings)).toBe(apartmentPrice(u, d.settings))
  })

  it('typ bytu môže mať vlastnú základnú cenu za m²; kde ju nemá, platí spoločná', () => {
    const d = base()
    d.settings.pricing = { ...d.settings.pricing, basePerM2: 4500, floorAdjPct: [0, 2, 4], roundTo: 500, baseByBedrooms: { 1: 7500, 2: 7000 } }
    d.settings.areaCoef = { coveredTerrace: 0.5, loggia: 0.75, roofTerrace: 0.25, garden: 0.1 }
    const two = { ...d.units[0], bedrooms: 2, floor: 0, interior: 60.12, coveredTerrace: 12.2, loggia: 2, roofTerrace: 0, garden: 0 }
    const one = { ...d.units[0], bedrooms: 1, floor: 1, interior: 37.53, coveredTerrace: 11.82, loggia: 0, roofTerrace: 0, garden: 0 }
    const three = { ...two, bedrooms: 3 }
    expect(basePerM2For(two, d.settings)).toBe(7000)
    expect(basePerM2For(one, d.settings)).toBe(7500)
    expect(basePerM2For(three, d.settings)).toBe(4500)
    // 67,72 m² × 7 000 = 474 040 → 474 000;  43,44 m² × 7 500 × 1,02 = 332 316 → 332 500
    expect(apartmentPrice(two, d.settings)).toBe(474_000)
    expect(apartmentPrice(one, d.settings)).toBe(332_500)
    expect(apartmentPrice(three, d.settings)).toBe(304_500)
    // nula vlastnú cenu vypína a ručne zadaná cena má stále prednosť
    d.settings.pricing.baseByBedrooms = { 1: 0, 2: 7000 }
    expect(basePerM2For(one, d.settings)).toBe(4500)
    expect(apartmentPrice({ ...two, priceMode: 'manual', manualPrice: 400_000 }, d.settings)).toBe(400_000)
  })

  it('bez vlastných cien podľa typu sa cenník nemení', () => {
    const d = base()
    const before = run(d).units.map((u) => u.apartment)
    d.settings.pricing = { ...d.settings.pricing, baseByBedrooms: {} }
    expect(run(d).units.map((u) => u.apartment)).toEqual(before)
  })

  it('cena parkovania sa nezaokrúhľuje spolu s cenou bytu', () => {
    const d = base()
    d.settings.pricing = { ...d.settings.pricing, parkingPrice: 9_990, roundTo: 500 }
    const u = d.units[0]
    expect(apartmentPrice(u, d.settings) % 500).toBe(0)
    expect(listPrice(u, d.settings)).toBe(apartmentPrice(u, d.settings) + 9_990 * u.parking)
  })
})

describe('výkaz výmer', () => {
  it('oddiely domu sa násobia počtom domov, areál nie', () => {
    const d = base()
    const t = boqTotals(d)
    expect(t.buildings).toBeCloseTo(t.perBuilding * d.buildings.length, 4)
    expect(t.total).toBeCloseTo(t.buildings + t.site, 4)
    const one = boqTotals({ ...d, buildings: d.buildings.slice(0, 1) })
    expect(one.perBuilding).toBeCloseTo(t.perBuilding, 4)
    expect(one.site).toBeCloseTo(t.site, 4)
  })

  it('zmena stavebných nákladov sa prenesie lineárne', () => {
    const d = base()
    expect(boqTotals(d, 10).total).toBeCloseTo(boqTotals(d).total * 1.1, 4)
  })
})

describe('model projektu', () => {
  it('mesačné toky sedia na ročné súčty', () => {
    const r = run()
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
    expect(sum(r.cash.inflow)).toBeCloseTo(r.revenue.net, 2)
    expect(sum(r.cash.outflow)).toBeCloseTo(r.costs.total, 2)
    const groups = Object.values(r.cash.outByGroup).reduce((a, g) => a + sum(g), 0)
    expect(groups).toBeCloseTo(r.costs.total, 2)
    expect(sum(r.costs.groups.map((g) => g.plan))).toBeCloseTo(r.costs.total, 2)
  })

  it('zisk = tržby bez DPH − náklady − financovanie', () => {
    const r = run()
    expect(r.kpi.profit).toBeCloseTo(r.revenue.net - r.costs.total - r.finance.cost, 2)
    expect(r.revenue.net).toBeCloseTo(r.revenue.gross / 1.25, 2)
  })

  it('financovanie pokryje všetky výdavky a úver sa splatí', () => {
    const r = run()
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
    expect(r.finance.loanBal[r.n - 1]).toBeCloseTo(0, 2)
    expect(sum(r.finance.loanDraw)).toBeCloseTo(sum(r.finance.loanRepay), 2)
    // Vklady − výbery investora = − zisk pred zdanením
    expect(sum(r.finance.equityOut) - sum(r.finance.equityIn)).toBeCloseTo(r.kpi.profit, 1)
    expect(Math.min(...r.finance.cashBal)).toBeGreaterThanOrEqual(-1e-6)
  })

  it('nedostatok zdrojov sa vykáže ako nekrytá potreba', () => {
    const d = base()
    d.settings.finance.equity = 100_000
    d.settings.finance.loanLimit = 0
    const r = run(d)
    expect(r.finance.gap).toBeGreaterThan(0)
    expect(r.finance.interest).toBe(0)
  })

  it('vyššie ceny zvyšujú zisk, drahšia stavba ho znižuje', () => {
    const d = base()
    const b = run(d).kpi.profit
    expect(run(d, { ...NO_ADJ, priceDeltaPct: 5 }).kpi.profit).toBeGreaterThan(b)
    expect(run(d, { ...NO_ADJ, constructionDeltaPct: 10 }).kpi.profit).toBeLessThan(b)
  })

  it('meškanie posunie odovzdanie a zvýši réžiu', () => {
    const d = base()
    const a = run(d)
    const b = run(d, { ...NO_ADJ, delayMonths: 6 })
    expect(b.ms.handover).toBe(a.ms.handover + 6)
    expect(b.ms.constructionEnd).toBe(a.ms.constructionEnd + 6)
    expect(b.costs.total).toBeGreaterThan(a.costs.total)
  })

  it('zmluvná cena predanej jednotky sa scenárom nemení', () => {
    const d = base()
    d.units[0] = { ...d.units[0], status: 'sold', soldPrice: 300_000, saleDate: '2027-02-10' }
    const a = run(d).units[0]
    const b = run(d, { ...NO_ADJ, priceDeltaPct: 20 }).units[0]
    expect(a.price).toBe(300_000)
    expect(b.price).toBe(300_000)
    expect(a.saleMonth).toBe(3)
  })

  it('splátkový kalendár z obchodu nahrádza štandardné splátky', () => {
    const d = base()
    d.units[0] = { ...d.units[0], status: 'sold', soldPrice: 250_000, saleDate: '2027-01-05' }
    d.payments = [{ id: 'p1', unitId: d.units[0].id, clientId: null, label: 'Záloha', due: '2027-01-20', amount: 50_000, paid: true, paidDate: '2027-01-22' }]
    const r = run(d)
    const without = run({ ...d, payments: [] })
    expect(r.revenue.net).toBeCloseTo(without.revenue.net, 2)
    expect(r.cash.inflow[2]).toBeGreaterThanOrEqual(50_000 / 1.25 - 1e-6)
  })

  it('minimálne vlastné zdroje práve pokryjú potrebu pri danom úvere', () => {
    const d = base()
    const need = minEquity(d, NO_ADJ, { today: TODAY })
    const at = (equity: number) => run({ ...d, settings: { ...d.settings, finance: { ...d.settings.finance, equity } } }).finance.gap
    expect(at(need)).toBeLessThanOrEqual(1)
    expect(at(need - 5000)).toBeGreaterThan(1)
    // bez úveru treba viac vlastných zdrojov
    const noLoan = { ...d, settings: { ...d.settings, finance: { ...d.settings.finance, loanLimit: 0 } } }
    expect(minEquity(noLoan, NO_ADJ, { today: TODAY })).toBeGreaterThan(need)
  })

  it('bod zvratu vynuluje zisk', () => {
    const d = base()
    const delta = breakevenPriceDelta(d, NO_ADJ, { today: TODAY })
    expect(delta).not.toBeNull()
    const r = run(d, { ...NO_ADJ, priceDeltaPct: delta ?? 0 })
    expect(Math.abs(r.kpi.profit)).toBeLessThan(50)
  })

  it('etapizácia posúva výdavky na stavbu', () => {
    const d = base()
    const a = run(d)
    d.buildings[1] = { ...d.buildings[1], startOffset: 6 }
    const b = run(d)
    expect(b.costs.total).toBeCloseTo(a.costs.total, 2)
    const firstHalf = (r: typeof a) => r.cash.outByGroup.build.slice(0, 12).reduce((x, y) => x + y, 0)
    expect(firstHalf(b)).toBeLessThan(firstHalf(a))
  })
})

describe('IRR', () => {
  it('spočíta ročnú výnosnosť z mesačných tokov', () => {
    const flows = [-1000, ...Array.from({ length: 11 }, () => 0), 1100]
    expect(irrAnnual(flows)).toBeCloseTo(0.1, 4)
  })
  it('bez zmeny znamienka vráti null', () => {
    expect(irrAnnual([100, 200])).toBeNull()
    expect(irrAnnual([-100, -200])).toBeNull()
  })
})
