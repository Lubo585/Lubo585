import { describe, expect, it } from 'vitest'
import { DEMO_PARAMS } from '../data/demo'
import { createProject } from '../data/templates'
import { boqTotals, breakevenPriceDelta, compute, irrAnnual, listPrice, minEquity, sellableArea, NO_ADJ } from './calc'

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
