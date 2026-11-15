// Výpočtový model projektu: tržby, náklady, cash-flow, financovanie a ukazovatele.
// Čisté funkcie bez závislosti na UI – dajú sa testovať samostatne.

import type {
  BoqSection,
  Building,
  CostGroupId,
  CostItem,
  Phase,
  ProjectData,
  Settings,
  Unit,
  UnitStatus,
} from '../types'
import { monthIndex, todayIso } from './format'

/** Úprava vstupov pre scenáre a citlivostnú analýzu. */
export interface Adj {
  priceDeltaPct: number
  constructionDeltaPct: number
  landDeltaPct: number
  delayMonths: number
  salesShiftMonths: number
  interestDeltaPp: number
}

export const NO_ADJ: Adj = {
  priceDeltaPct: 0,
  constructionDeltaPct: 0,
  landDeltaPct: 0,
  delayMonths: 0,
  salesShiftMonths: 0,
  interestDeltaPp: 0,
}

export const COST_GROUPS: { id: CostGroupId; name: string }[] = [
  { id: 'land', name: 'Pozemok' },
  { id: 'prep', name: 'Príprava a poplatky' },
  { id: 'build', name: 'Stavba' },
  { id: 'soft', name: 'Vedľajšie náklady stavby' },
  { id: 'sales', name: 'Predaj a marketing' },
  { id: 'overhead', name: 'Réžia a prevádzka' },
  { id: 'reserve', name: 'Rezerva' },
]

export const SOLD_STATUSES: UnitStatus[] = ['reserved', 'precontract', 'sold', 'handed']

// ───────────────────────── Jednotky a ceny ─────────────────────────

/** Predajná (prepočítaná) plocha: interiér + exteriéry vážené koeficientmi. */
export function sellableArea(u: Unit, s: Settings): number {
  const c = s.areaCoef
  return (
    u.interior +
    u.coveredTerrace * c.coveredTerrace +
    u.loggia * c.loggia +
    u.roofTerrace * c.roofTerrace +
    u.garden * c.garden
  )
}

/** Cenníková cena jednotky (v cenníkovom vyjadrení – spravidla s DPH). */
export function listPrice(u: Unit, s: Settings): number {
  if (u.priceMode === 'manual') return u.manualPrice
  const p = s.pricing
  const floorAdj = p.floorAdjPct.length
    ? (p.floorAdjPct[Math.min(u.floor, p.floorAdjPct.length - 1)] ?? 0)
    : 0
  const buildingAdj = p.buildingAdjPct[u.buildingId] ?? 0
  const raw =
    sellableArea(u, s) * p.basePerM2 * (1 + floorAdj / 100) * (1 + buildingAdj / 100) +
    u.parking * p.parkingPrice
  const r = p.roundTo > 0 ? p.roundTo : 1
  return Math.round(raw / r) * r
}

export function isSold(u: Unit): boolean {
  return SOLD_STATUSES.includes(u.status)
}

/** Účinná cena: zmluvná pri predaných, cenníková (± scenár) pri voľných. */
export function effectivePrice(u: Unit, s: Settings, adj: Adj = NO_ADJ): number {
  if (isSold(u) && u.soldPrice != null && u.soldPrice > 0) return u.soldPrice
  const lp = listPrice(u, s)
  return isSold(u) ? lp : lp * (1 + adj.priceDeltaPct / 100)
}

export function netOfVat(gross: number, s: Settings): number {
  return s.pricesIncludeVat ? gross / (1 + s.vatPct / 100) : gross
}

// ───────────────────────── Harmonogram ─────────────────────────

/** Predĺženie výstavby: stavebné fázy sa natiahnu, dokončovacie posunú. */
export function adjustPhases(phases: Phase[], delay: number): Phase[] {
  if (!delay) return phases
  const build = phases.filter((p) => p.group === 'build')
  if (!build.length) return phases
  const cStart = Math.min(...build.map((p) => p.start))
  const cEnd = Math.max(...build.map((p) => p.start + p.duration))
  const len = Math.max(1, cEnd - cStart)
  const f = (len + delay) / len
  return phases.map((p) => {
    if (p.group === 'build') {
      const s = Math.round(cStart + (p.start - cStart) * f)
      const e = Math.round(cStart + (p.start + p.duration - cStart) * f)
      return { ...p, start: s, duration: Math.max(1, e - s) }
    }
    if (p.group === 'finish') return { ...p, start: p.start + delay }
    return p
  })
}

export interface Milestones {
  constructionStart: number
  constructionEnd: number
  shell: number
  handover: number
  projectEnd: number // koniec poslednej nepredajnej fázy
}

export function milestones(phases: Phase[]): Milestones {
  const build = phases.filter((p) => p.group === 'build')
  const constructionStart = build.length ? Math.min(...build.map((p) => p.start)) : 0
  const constructionEnd = build.length
    ? Math.max(...build.map((p) => p.start + p.duration))
    : constructionStart + 1
  const shellPhase = phases.find((p) => p.tag === 'shell')
  const handoverPhase = phases.find((p) => p.tag === 'handover')
  const nonSales = phases.filter((p) => p.group !== 'sales')
  return {
    constructionStart,
    constructionEnd,
    shell: shellPhase ? shellPhase.start + shellPhase.duration : constructionEnd,
    handover: handoverPhase ? handoverPhase.start : constructionEnd,
    projectEnd: nonSales.length ? Math.max(...nonSales.map((p) => p.start + p.duration)) : constructionEnd,
  }
}

// ───────────────────────── Pomocné funkcie ─────────────────────────

function ensure(arr: number[], idx: number): void {
  while (arr.length <= idx) arr.push(0)
}

/** Rozloží sumu rovnomerne na mesiace [start, start + months). */
function spread(arr: number[], start: number, months: number, amount: number): void {
  if (!amount) return
  const s = Math.max(0, Math.round(start))
  const n = Math.max(1, Math.round(months))
  const part = amount / n
  for (let i = 0; i < n; i++) {
    ensure(arr, s + i)
    arr[s + i] += part
  }
}

/** Rozloží sumu podľa tvaru inej krivky (váhy). */
function spreadByCurve(arr: number[], curve: number[], amount: number, fallbackMonth: number): void {
  if (!amount) return
  const total = curve.reduce((a, b) => a + b, 0)
  if (total <= 0) {
    spread(arr, fallbackMonth, 1, amount)
    return
  }
  for (let i = 0; i < curve.length; i++) {
    if (!curve[i]) continue
    ensure(arr, i)
    arr[i] += (amount * curve[i]) / total
  }
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

/** Ročná IRR z mesačných tokov (bisekcia). Vráti null, ak neexistuje. */
export function irrAnnual(flows: number[]): number | null {
  const hasNeg = flows.some((v) => v < -1e-6)
  const hasPos = flows.some((v) => v > 1e-6)
  if (!hasNeg || !hasPos) return null
  const npv = (r: number) => {
    let v = 0
    for (let t = 0; t < flows.length; t++) v += flows[t] / (1 + r) ** t
    return v
  }
  let lo = -0.95
  let hi = 1
  let fLo = npv(lo)
  let fHi = npv(hi)
  if (fLo * fHi > 0) {
    hi = 10
    fHi = npv(hi)
    if (fLo * fHi > 0) return null
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (fLo * fMid <= 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  const monthly = (lo + hi) / 2
  return (1 + monthly) ** 12 - 1
}

// ───────────────────────── Výkaz výmer ─────────────────────────

export interface BoqSectionTotal {
  section: BoqSection
  perUnit: number // suma oddielu pri množstve 1× (1 dom alebo areál)
  multiplier: number
  total: number
  items: number
}

export interface BoqTotals {
  sections: BoqSectionTotal[]
  perBuilding: number
  buildings: number
  site: number
  total: number
}

export function boqTotals(data: ProjectData, constructionDeltaPct = 0): BoqTotals {
  const nB = Math.max(1, data.buildings.length)
  const k = 1 + constructionDeltaPct / 100
  const bySection = new Map<string, { amount: number; items: number }>()
  for (const it of data.boq) {
    const cur = bySection.get(it.sectionId) ?? { amount: 0, items: 0 }
    cur.amount += it.qty * it.unitPrice
    cur.items += 1
    bySection.set(it.sectionId, cur)
  }
  const sections: BoqSectionTotal[] = data.boqSections.map((section) => {
    const s = bySection.get(section.id) ?? { amount: 0, items: 0 }
    const multiplier = section.scope === 'building' ? nB : 1
    return { section, perUnit: s.amount * k, multiplier, total: s.amount * k * multiplier, items: s.items }
  })
  const perBuilding = sum(sections.filter((s) => s.section.scope === 'building').map((s) => s.perUnit))
  const site = sum(sections.filter((s) => s.section.scope === 'site').map((s) => s.total))
  return { sections, perBuilding, buildings: perBuilding * nB, site, total: perBuilding * nB + site }
}

// ───────────────────────── Hlavný výpočet ─────────────────────────

export interface UnitCalc {
  unit: Unit
  building: Building | undefined
  area: number // predajná plocha
  list: number // cenníková cena
  price: number // účinná cena (cenníkové vyjadrenie)
  net: number // tržba bez DPH
  saleMonth: number
  sold: boolean
}

export interface CostLine {
  item: CostItem
  plan: number
  monthly: number[]
}

export interface GroupTotal {
  id: CostGroupId
  name: string
  plan: number
  contracted: number
  paid: number
}

export interface Results {
  n: number // počet mesiacov modelu
  nowIdx: number
  phases: Phase[] // po úprave scenárom
  ms: Milestones
  units: UnitCalc[]
  revenue: {
    gross: number
    net: number
    area: number
    interior: number
    avgPerM2: number // cenníková cena / m² predajnej plochy
    soldCount: number
    soldGross: number
    soldNet: number
    freeGross: number
    byStatus: Record<UnitStatus, { count: number; gross: number }>
  }
  boq: BoqTotals
  costs: {
    lines: CostLine[]
    groups: GroupTotal[]
    construction: number // výkaz výmer (domy + areál), bez rezervy
    total: number // bez financovania
    contracted: number
    paid: number
  }
  cash: {
    inflow: number[]
    outflow: number[]
    outByGroup: Record<CostGroupId, number[]>
    net: number[]
    cum: number[] // kumulatívny tok bez financovania
  }
  finance: {
    interest: number
    fee: number
    cost: number
    interestM: number[]
    equityIn: number[]
    equityOut: number[]
    loanDraw: number[]
    loanRepay: number[]
    loanBal: number[]
    cashBal: number[]
    equityOutstanding: number[]
    peakEquity: number
    peakLoan: number
    gap: number // nekrytá potreba nad rámec vlastných zdrojov a úveru
  }
  kpi: {
    totalCost: number // vrátane financovania
    profit: number // pred zdanením
    tax: number
    netProfit: number
    marginRevenue: number // % z tržieb
    marginCost: number // % z nákladov
    roe: number // % čistý zisk / maximálne viazané vlastné zdroje
    irrProject: number | null
    irrEquity: number | null
    paybackMonth: number | null
    costPerM2Area: number
    constructionPerM2Gfa: number
    landPerM2Area: number
    gfa: number
  }
}

interface ComputeOpts {
  today?: string
}

export function compute(data: ProjectData, adj: Adj = NO_ADJ, opts: ComputeOpts = {}): Results {
  const s = data.settings
  const nowIdx = Math.max(0, monthIndex(s.startMonth, opts.today ?? todayIso()))
  const phases = adjustPhases(data.phases, adj.delayMonths)
  const ms = milestones(phases)
  const phaseById = new Map(phases.map((p) => [p.id, p]))
  const buildingById = new Map(data.buildings.map((b) => [b.id, b]))

  // ── Tržby ──
  const salesStart = Math.max(s.sales.startMonth, nowIdx)
  const salesEnd = Math.max(salesStart + 1, s.sales.endMonth + adj.salesShiftMonths)
  const freeUnits = data.units.filter((u) => !isSold(u))
  const freeOrder = new Map(freeUnits.map((u, i) => [u.id, i]))

  const units: UnitCalc[] = data.units.map((u) => {
    const sold = isSold(u)
    const list = listPrice(u, s)
    const price = effectivePrice(u, s, adj)
    let saleMonth: number
    if (sold) {
      saleMonth = u.saleDate ? Math.max(0, monthIndex(s.startMonth, u.saleDate)) : nowIdx
    } else {
      const k = freeOrder.get(u.id) ?? 0
      saleMonth = Math.floor(salesStart + ((k + 0.5) / Math.max(1, freeUnits.length)) * (salesEnd - salesStart))
    }
    return {
      unit: u,
      building: buildingById.get(u.buildingId),
      area: sellableArea(u, s),
      list,
      price,
      net: netOfVat(price, s),
      saleMonth,
      sold,
    }
  })

  const inflow: number[] = []
  const paymentsByUnit = new Map<string, typeof data.payments>()
  for (const p of data.payments) {
    const list = paymentsByUnit.get(p.unitId) ?? []
    list.push(p)
    paymentsByUnit.set(p.unitId, list)
  }
  for (const uc of units) {
    const off = uc.building?.startOffset ?? 0
    const shellM = Math.max(uc.saleMonth, ms.shell + off)
    const handM = Math.max(uc.saleMonth + 1, ms.handover + off)
    const pays = paymentsByUnit.get(uc.unit.id)
    if (uc.sold && pays && pays.length) {
      // Skutočný splátkový kalendár z obchodu; nepokrytý zvyšok pri odovzdaní.
      let covered = 0
      for (const p of pays) {
        const m = Math.max(0, monthIndex(s.startMonth, p.paid && p.paidDate ? p.paidDate : p.due))
        spread(inflow, m, 1, netOfVat(p.amount, s))
        covered += p.amount
      }
      const rest = uc.price - covered
      if (rest > 1) spread(inflow, handM, 1, netOfVat(rest, s))
    } else {
      const dep = uc.net * (s.sales.depositPct / 100)
      const shell = uc.net * (s.sales.shellPct / 100)
      spread(inflow, uc.saleMonth, 1, dep)
      spread(inflow, shellM, 1, shell)
      spread(inflow, handM, 1, uc.net - dep - shell)
    }
  }

  const byStatus: Record<UnitStatus, { count: number; gross: number }> = {
    free: { count: 0, gross: 0 },
    reserved: { count: 0, gross: 0 },
    precontract: { count: 0, gross: 0 },
    sold: { count: 0, gross: 0 },
    handed: { count: 0, gross: 0 },
  }
  for (const uc of units) {
    byStatus[uc.unit.status].count += 1
    byStatus[uc.unit.status].gross += uc.price
  }
  const revGross = sum(units.map((u) => u.price))
  const revNet = sum(units.map((u) => u.net))
  const area = sum(units.map((u) => u.area))
  const soldUnits = units.filter((u) => u.sold)

  // ── Výkaz výmer a krivka výstavby ──
  const boq = boqTotals(data, adj.constructionDeltaPct)
  const curveBuilding: number[] = []
  const curveSite: number[] = []
  for (const st of boq.sections) {
    const ph = st.section.phaseId ? phaseById.get(st.section.phaseId) : undefined
    const start = ph ? ph.start : ms.constructionStart
    const dur = ph ? ph.duration : Math.max(1, ms.constructionEnd - ms.constructionStart)
    if (st.section.scope === 'building') {
      const list = data.buildings.length ? data.buildings : [undefined]
      for (const b of list) spread(curveBuilding, start + (b?.startOffset ?? 0), dur, st.perUnit)
    } else {
      spread(curveSite, start, dur, st.total)
    }
  }
  const curveAll: number[] = []
  for (let i = 0; i < Math.max(curveBuilding.length, curveSite.length); i++) {
    curveAll[i] = (curveBuilding[i] ?? 0) + (curveSite[i] ?? 0)
  }

  // ── Náklady ──
  const landBase = sum(data.parcels.map((p) => p.area * p.pricePerM2)) * (1 + adj.landDeltaPct / 100)
  const constructionBase = boq.total
  const salesWindow = Math.max(1, salesEnd - Math.min(salesStart, s.sales.startMonth))

  const timingMonths = (c: CostItem): number => {
    const t = c.timing
    if (t.mode === 'range') return Math.max(1, t.months)
    if (t.mode === 'phase') return Math.max(1, phaseById.get(t.phaseId)?.duration ?? 1)
    if (t.mode === 'construction') return Math.max(1, ms.constructionEnd - ms.constructionStart)
    if (t.mode === 'project') return Math.max(1, ms.projectEnd)
    if (t.mode === 'sales') return salesWindow
    return 1
  }

  const planOf = (c: CostItem): number => {
    const k = c.calc
    switch (k.kind) {
      case 'fixed':
        return k.amount
      case 'land':
        return landBase
      case 'qty':
        return k.qty * k.unitPrice
      case 'pct': {
        const base = k.base === 'land' ? landBase : k.base === 'construction' ? constructionBase : revNet
        return (base * k.pct) / 100
      }
      case 'boq':
        return k.scope === 'building' ? boq.buildings : boq.site
      case 'monthly':
        return k.amount * timingMonths(c)
    }
  }

  const lines: CostLine[] = data.costs.map((item) => {
    const plan = planOf(item)
    const monthly: number[] = []
    const t = item.timing
    if (item.calc.kind === 'boq') {
      const curve = item.calc.scope === 'building' ? curveBuilding : curveSite
      spreadByCurve(monthly, curve, plan, ms.constructionStart)
    } else if (t.mode === 'month') {
      spread(monthly, t.month, 1, plan)
    } else if (t.mode === 'range') {
      spread(monthly, t.start, t.months, plan)
    } else if (t.mode === 'phase') {
      const ph = phaseById.get(t.phaseId)
      spread(monthly, ph ? ph.start : 0, ph ? ph.duration : 1, plan)
    } else if (t.mode === 'construction') {
      spreadByCurve(monthly, curveAll, plan, ms.constructionStart)
    } else if (t.mode === 'project') {
      spread(monthly, 0, Math.max(1, ms.projectEnd), plan)
    } else {
      spreadByCurve(monthly, inflow, plan, salesEnd)
    }
    return { item, plan, monthly }
  })

  const outByGroup = {} as Record<CostGroupId, number[]>
  for (const g of COST_GROUPS) outByGroup[g.id] = []
  const outflow: number[] = []
  for (const l of lines) {
    for (let i = 0; i < l.monthly.length; i++) {
      if (!l.monthly[i]) continue
      ensure(outflow, i)
      outflow[i] += l.monthly[i]
      ensure(outByGroup[l.item.group], i)
      outByGroup[l.item.group][i] += l.monthly[i]
    }
  }

  const lastPhaseEnd = phases.length ? Math.max(...phases.map((p) => p.start + p.duration)) : 0
  const n = Math.max(inflow.length, outflow.length, lastPhaseEnd, 1)
  for (const arr of [inflow, outflow, ...Object.values(outByGroup)]) ensure(arr, n - 1)

  const groups: GroupTotal[] = COST_GROUPS.map((g) => {
    const ls = lines.filter((l) => l.item.group === g.id)
    return {
      id: g.id,
      name: g.name,
      plan: sum(ls.map((l) => l.plan)),
      contracted: sum(ls.map((l) => l.item.contracted)),
      paid: sum(ls.map((l) => l.item.paid)),
    }
  })
  const costTotal = sum(lines.map((l) => l.plan))

  const net = inflow.map((v, i) => v - outflow[i])
  const cum: number[] = []
  net.reduce((acc, v, i) => {
    cum[i] = acc + v
    return cum[i]
  }, 0)

  // ── Financovanie ──
  // Poradie zdrojov: vlastné zdroje → úver → (nekryté). Prebytky najprv splácajú úver,
  // potom sa vyplácajú investorovi nad rámec rezervy na budúce výdavky.
  const need: number[] = Array.from({ length: n }, () => 0)
  for (let t = n - 2; t >= 0; t--) need[t] = Math.max(0, need[t + 1] + outflow[t + 1] - inflow[t + 1])

  const rate = Math.max(0, s.finance.interestPct + adj.interestDeltaPp) / 100 / 12
  const equityIn = Array.from({ length: n }, () => 0)
  const equityOut = Array.from({ length: n }, () => 0)
  const loanDraw = Array.from({ length: n }, () => 0)
  const loanRepay = Array.from({ length: n }, () => 0)
  const loanBal = Array.from({ length: n }, () => 0)
  const cashBal = Array.from({ length: n }, () => 0)
  const interestM = Array.from({ length: n }, () => 0)
  let cash = 0
  let loan = 0
  let equityLeft = Math.max(0, s.finance.equity)
  let loanUsed = false
  let fee = 0
  let gap = 0
  for (let t = 0; t < n; t++) {
    interestM[t] = loan * rate
    cash += inflow[t] - outflow[t] - interestM[t]
    if (cash < 0) {
      let short = -cash
      const e = Math.min(equityLeft, short)
      equityIn[t] += e
      equityLeft -= e
      short -= e
      if (short > 1e-9 && s.finance.loanLimit > 0) {
        if (!loanUsed) {
          loanUsed = true
          fee = (s.finance.loanLimit * s.finance.feePct) / 100
          short += fee
        }
        const d = Math.min(Math.max(0, s.finance.loanLimit - loan), short)
        loan += d
        loanDraw[t] += d
        short -= d
      }
      if (short > 1e-9) {
        gap += short
        equityIn[t] += short
      }
      cash = 0
    } else {
      const r = Math.min(loan, cash)
      loan -= r
      loanRepay[t] += r
      cash -= r
      if (loan <= 1e-9) {
        const dist = Math.max(0, cash - need[t])
        cash -= dist
        equityOut[t] += dist
      }
    }
    loanBal[t] = loan
    cashBal[t] = cash
  }
  equityOut[n - 1] += cash
  const interest = sum(interestM)
  const financeCost = interest + fee

  // ── Ukazovatele ──
  const totalCost = costTotal + financeCost
  const profit = revNet - totalCost
  const tax = Math.max(0, profit) * (s.profitTaxPct / 100)
  const netProfit = profit - tax

  const equityFlows = equityOut.map((v, i) => v - equityIn[i])
  equityFlows[n - 1] -= tax
  const equityOutstanding: number[] = []
  let outstanding = 0
  let peakEquity = 0
  for (let t = 0; t < n; t++) {
    outstanding += equityIn[t] - equityOut[t]
    equityOutstanding[t] = Math.max(0, outstanding)
    peakEquity = Math.max(peakEquity, outstanding)
  }

  let paybackMonth: number | null = null
  for (let t = 0; t < n; t++) {
    if (cum[t] >= 0 && cum.slice(t).every((v) => v >= -1e-6)) {
      paybackMonth = t
      break
    }
  }
  if (paybackMonth === 0 && cum.every((v) => v >= 0) && sum(outflow) === 0) paybackMonth = null

  const gfa = sum(data.buildings.map((b) => b.grossFloorArea))
  const landPlan = sum(lines.filter((l) => l.item.group === 'land').map((l) => l.plan))
  const buildPlan = sum(lines.filter((l) => l.item.group === 'build').map((l) => l.plan))

  return {
    n,
    nowIdx,
    phases,
    ms,
    units,
    revenue: {
      gross: revGross,
      net: revNet,
      area,
      interior: sum(data.units.map((u) => u.interior)),
      avgPerM2: area > 0 ? sum(units.map((u) => u.list)) / area : 0,
      soldCount: soldUnits.length,
      soldGross: sum(soldUnits.map((u) => u.price)),
      soldNet: sum(soldUnits.map((u) => u.net)),
      freeGross: sum(units.filter((u) => !u.sold).map((u) => u.price)),
      byStatus,
    },
    boq,
    costs: {
      lines,
      groups,
      construction: constructionBase,
      total: costTotal,
      contracted: sum(groups.map((g) => g.contracted)),
      paid: sum(groups.map((g) => g.paid)),
    },
    cash: { inflow, outflow, outByGroup, net, cum },
    finance: {
      interest,
      fee,
      cost: financeCost,
      interestM,
      equityIn,
      equityOut,
      loanDraw,
      loanRepay,
      loanBal,
      cashBal,
      equityOutstanding,
      peakEquity,
      peakLoan: Math.max(0, ...loanBal),
      gap,
    },
    kpi: {
      totalCost,
      profit,
      tax,
      netProfit,
      marginRevenue: revNet > 0 ? (profit / revNet) * 100 : 0,
      marginCost: totalCost > 0 ? (profit / totalCost) * 100 : 0,
      roe: peakEquity > 0 ? (netProfit / peakEquity) * 100 : 0,
      irrProject: irrAnnual(net),
      irrEquity: irrAnnual(equityFlows),
      paybackMonth,
      costPerM2Area: area > 0 ? totalCost / area : 0,
      constructionPerM2Gfa: gfa > 0 ? buildPlan / gfa : 0,
      landPerM2Area: area > 0 ? landPlan / area : 0,
      gfa,
    },
  }
}

/**
 * Hodnota zvoleného parametra (v %), pri ktorej je zisk pred zdanením nulový.
 * Vráti null, ak v rozsahu [lo, hi] riešenie neexistuje.
 */
export function breakeven(
  data: ProjectData,
  field: 'priceDeltaPct' | 'constructionDeltaPct' | 'landDeltaPct',
  adj: Adj = NO_ADJ,
  opts: ComputeOpts = {},
  lo = -90,
  hi = 300,
): number | null {
  const f = (d: number) => compute(data, { ...adj, [field]: d }, opts).kpi.profit
  let fLo = f(lo)
  const fHi = f(hi)
  if (fLo === 0) return lo
  if (fLo * fHi > 0) return null
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2
    const fMid = f(mid)
    if (fLo * fMid <= 0) hi = mid
    else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}

/** Zmena cien (v %), pri ktorej je zisk pred zdanením nulový. Platí pre nepredané jednotky. */
export function breakevenPriceDelta(data: ProjectData, adj: Adj = NO_ADJ, opts: ComputeOpts = {}): number | null {
  if (!data.units.some((u) => !isSold(u))) return null
  return breakeven(data, 'priceDeltaPct', adj, opts)
}

/** Najmenšie vlastné zdroje, pri ktorých daný úverový rámec pokryje všetky výdavky (na tisíce nahor). */
export function minEquity(data: ProjectData, adj: Adj = NO_ADJ, opts: ComputeOpts = {}): number {
  const withEquity = (equity: number) =>
    compute({ ...data, settings: { ...data.settings, finance: { ...data.settings.finance, equity } } }, adj, opts).finance.gap
  if (withEquity(0) <= 1) return 0
  let lo = 0
  let hi = 1_000_000
  while (withEquity(hi) > 1 && hi < 1e10) hi *= 2
  for (let i = 0; i < 40 && hi - lo > 500; i++) {
    const mid = (lo + hi) / 2
    if (withEquity(mid) > 1) lo = mid
    else hi = mid
  }
  return Math.ceil(hi / 1000) * 1000
}

/** Matica citlivosti zisku na cenu a stavebné náklady. */
export function sensitivity(
  data: ProjectData,
  priceSteps: number[],
  costSteps: number[],
  opts: ComputeOpts = {},
): { profit: number; margin: number }[][] {
  return costSteps.map((c) =>
    priceSteps.map((p) => {
      const r = compute(data, { ...NO_ADJ, priceDeltaPct: p, constructionDeltaPct: c }, opts)
      return { profit: r.kpi.profit, margin: r.kpi.marginRevenue }
    }),
  )
}

// ───────────────────────── Alternatívne stratégie ─────────────────────────

export interface RentResult {
  revenue: number // ročné tržby z prenájmu
  costs: number
  noi: number // čistý prevádzkový výnos
  yieldOnCost: number // % NOI / celkové náklady projektu
  value: number // ocenenie výnosovou metódou
  valueGain: number // hodnota − náklady
}

export function rentStrategy(data: ProjectData, r: Results): RentResult {
  const a = data.settings.rent
  let revenue = 0
  for (const u of data.units) {
    const adr = u.bedrooms >= 2 ? (u.roofTerrace > 0 ? a.adr2roof : a.adr2) : u.roofTerrace > 0 ? (a.adr1 + a.adr2) / 2 : a.adr1
    revenue += adr * a.nights
  }
  const costs = (revenue * a.feesPct) / 100 + a.costPerUnitYear * data.units.length
  const noi = revenue - costs
  const value = a.capRatePct > 0 ? noi / (a.capRatePct / 100) : 0
  return {
    revenue,
    costs,
    noi,
    yieldOnCost: r.kpi.totalCost > 0 ? (noi / r.kpi.totalCost) * 100 : 0,
    value,
    valueGain: value - r.kpi.totalCost,
  }
}

export interface LandExitResult {
  proceeds: number
  invested: number // pozemok + doteraz uhradené ostatné náklady
  profit: number
}

export function landExit(data: ProjectData, r: Results): LandExitResult {
  const areaTotal = sum(data.parcels.map((p) => p.area))
  const proceeds = areaTotal * data.settings.landExitPerM2
  const landPlan = sum(r.costs.lines.filter((l) => l.item.group === 'land').map((l) => l.plan))
  const otherPaid = sum(r.costs.lines.filter((l) => l.item.group !== 'land').map((l) => l.item.paid))
  const invested = landPlan + otherPaid
  return { proceeds, invested, profit: proceeds - invested }
}
