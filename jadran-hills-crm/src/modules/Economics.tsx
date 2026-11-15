import { Download, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { breakeven, compute, COST_GROUPS, isSold, landExit, minEquity, NO_ADJ, rentStrategy, sensitivity, type Adj, type Results } from '../lib/calc'
import { eur, eurShort, monthLabel, monthShort, num, pct, uid } from '../lib/format'
import { exportCsv } from '../lib/export'
import { useStore } from '../store'
import type { CostCalc, CostGroupId, CostItem, CostTiming, Scenario } from '../types'
import { SERIES } from '../ui/chartUtils'
import { ColumnChart, LineChart } from '../ui/charts'
import { cx } from '../ui/cx'
import { Badge, Button, Card, Check, Field, IconButton, Note, NumInput, PageHead, Select, Stat, Tabs, TextInput } from '../ui/kit'
import { TIMING_LABEL } from '../ui/labels'

type Tab = 'summary' | 'budget' | 'cash' | 'finance' | 'scenarios' | 'strategies' | 'assumptions'

const GROUP_COLOR: Record<CostGroupId, string> = {
  land: SERIES[0],
  prep: SERIES[1],
  build: SERIES[2],
  soft: SERIES[3],
  sales: SERIES[4],
  overhead: SERIES[5],
  reserve: SERIES[6],
}

const scenarioAdj = (sc: Scenario): Adj => ({
  ...NO_ADJ,
  priceDeltaPct: sc.priceDeltaPct,
  constructionDeltaPct: sc.constructionDeltaPct,
  delayMonths: sc.delayMonths,
  salesShiftMonths: sc.salesShiftMonths,
  interestDeltaPp: sc.interestDeltaPp,
})

export default function Economics() {
  const [tab, setTab] = useState<Tab>('summary')
  return (
    <>
      <PageHead
        title="Ekonomika projektu"
        sub="Tržby, náklady, zisk, peňažné toky a financovanie. Všetky čísla sa prepočítavajú z cenníka, výkazu výmer, harmonogramu a predpokladov."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'summary', label: 'Súhrn' },
          { id: 'budget', label: 'Rozpočet nákladov' },
          { id: 'cash', label: 'Cash-flow' },
          { id: 'finance', label: 'Financovanie' },
          { id: 'scenarios', label: 'Scenáre a citlivosť' },
          { id: 'strategies', label: 'Stratégie' },
          { id: 'assumptions', label: 'Predpoklady' },
        ]}
      />
      <div className="mt-3">
        {tab === 'summary' && <Summary />}
        {tab === 'budget' && <Budget />}
        {tab === 'cash' && <Cash />}
        {tab === 'finance' && <Finance />}
        {tab === 'scenarios' && <Scenarios />}
        {tab === 'strategies' && <Strategies />}
        {tab === 'assumptions' && <Assumptions />}
      </div>
    </>
  )
}

// ───────────────────────── Súhrn ─────────────────────────

function Summary() {
  const { data, r } = useStore()
  const s = data.settings
  const area = r.revenue.area
  const be = useMemo(() => (data.units.some((u) => !isSold(u)) ? breakeven(data, 'priceDeltaPct') : null), [data])
  const share = (v: number) => (r.revenue.net > 0 ? pct((v / r.revenue.net) * 100) : '—')
  const perM2 = (v: number) => (area > 0 ? eur(v / area) : '—')
  const vat = r.revenue.gross - r.revenue.net

  const rows: { label: string; value: number; kind?: 'total' | 'minus' | 'plain' }[] = [
    { label: s.pricesIncludeVat ? 'Tržby z predaja s DPH' : 'Tržby z predaja', value: r.revenue.gross, kind: 'plain' },
    ...(s.pricesIncludeVat ? [{ label: `DPH ${num(s.vatPct, 0)} %`, value: -vat, kind: 'minus' as const }] : []),
    { label: 'Tržby bez DPH', value: r.revenue.net, kind: 'total' },
    ...r.costs.groups.filter((g) => g.plan !== 0).map((g) => ({ label: g.name, value: -g.plan, kind: 'minus' as const })),
    { label: 'Financovanie (úroky a poplatky)', value: -r.finance.cost, kind: 'minus' },
    { label: 'Zisk pred zdanením', value: r.kpi.profit, kind: 'total' },
    { label: `Daň z príjmov ${num(s.profitTaxPct, 0)} %`, value: -r.kpi.tax, kind: 'minus' },
    { label: 'Čistý zisk', value: r.kpi.netProfit, kind: 'total' },
  ]

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Zisk pred zdanením" value={eurShort(r.kpi.profit)} tone={r.kpi.profit < 0 ? 'crit' : 'good'} />
        <Stat label="Marža z tržieb" value={pct(r.kpi.marginRevenue)} sub={`${pct(r.kpi.marginCost)} z nákladov`} tone={r.kpi.marginRevenue < 0 ? 'crit' : 'neutral'} />
        <Stat label="Výnos vlastných zdrojov" value={r.kpi.irrEquity === null ? '—' : pct(r.kpi.irrEquity * 100)} sub="ročne (IRR)" />
        <Stat label="Výnos projektu" value={r.kpi.irrProject === null ? '—' : pct(r.kpi.irrProject * 100)} sub="ročne, bez financovania" />
        <Stat label="ROE" value={pct(r.kpi.roe)} sub="čistý zisk / viazané zdroje" />
        <Stat label="Návratnosť" value={r.kpi.paybackMonth === null ? '—' : monthLabel(s.startMonth, r.kpi.paybackMonth)} sub="kumulatívny tok ≥ 0" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Výsledovka projektu" pad={false}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Položka</th>
                  <th className="num">Suma</th>
                  <th className="num">% z tržieb</th>
                  <th className="num">€ / m² pred. plochy</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.label} className={x.kind === 'total' ? 'total' : undefined}>
                    <td>{x.label}</td>
                    <td className={cx('num', x.kind === 'total' && x.value < 0 && 'text-crit-ink')}>{eur(x.value)}</td>
                    <td className="num text-ink-2">{share(x.value)}</td>
                    <td className="num text-ink-2">{perM2(x.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card title="Jednotkové ukazovatele">
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[13.5px]">
              {[
                ['Predajná plocha', `${num(area, 0)} m²`],
                ['Priemerná cenníková cena', `${eur(r.revenue.avgPerM2)}/m²`],
                ['Náklady na m² predajnej plochy', `${eur(r.kpi.costPerM2Area)}/m²`],
                ['z toho pozemok', `${eur(r.kpi.landPerM2Area)}/m²`],
                ['Stavba na m² hrubej podlažnej plochy', r.kpi.gfa > 0 ? `${eur(r.kpi.constructionPerM2Gfa)}/m²` : '—'],
                ['Cena pri nulovom zisku', be === null ? '—' : `${eur(r.revenue.avgPerM2 * (1 + be / 100))}/m² (${be >= 0 ? '+' : ''}${pct(be)})`],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="m-0 text-right font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Note>
            Náklady sú bez DPH (predpoklad: DPH z výstavby je odpočítateľná). Tržby sú po odpočítaní DPH z predajnej ceny.
            Daň z prevodu pri kúpe pozemku je nákladom. Časový posun vratiek DPH model nezohľadňuje. Referenčné trhové
            hodnoty nájdete v <a href="#projekt">Karte projektu</a>.
          </Note>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Rozpočet nákladov ─────────────────────────

function MonthSelect({ value, onChange, count, startMonth, ariaLabel }: { value: number; onChange: (v: number) => void; count: number; startMonth: string; ariaLabel: string }) {
  return (
    <Select
      cell
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      ariaLabel={ariaLabel}
      options={Array.from({ length: Math.max(count, value + 1) }, (_, i) => ({ value: String(i), label: monthLabel(startMonth, i) }))}
    />
  )
}

function CalcEditor({ item, onChange }: { item: CostItem; onChange: (c: CostCalc) => void }) {
  const c = item.calc
  if (c.kind === 'land') return <span className="text-muted">súčet parciel × cena</span>
  if (c.kind === 'boq') return <span className="text-muted">podľa výkazu výmer</span>
  if (c.kind === 'fixed') return <NumInput cell value={c.amount} onChange={(v) => onChange({ ...c, amount: v })} ariaLabel="Suma" />
  if (c.kind === 'monthly')
    return (
      <span className="flex items-center gap-1">
        <NumInput cell value={c.amount} onChange={(v) => onChange({ ...c, amount: v })} ariaLabel="Mesačná suma" />
        <span className="shrink-0 text-[12px] text-muted">€/mes.</span>
      </span>
    )
  if (c.kind === 'qty')
    return (
      <span className="flex items-center gap-1">
        <NumInput cell decimals={c.qty % 1 ? 2 : 0} value={c.qty} onChange={(v) => onChange({ ...c, qty: v })} ariaLabel="Množstvo" />
        <span className="shrink-0 text-[12px] text-muted">{c.unit} ×</span>
        <NumInput cell decimals={c.unitPrice % 1 ? 2 : 0} value={c.unitPrice} onChange={(v) => onChange({ ...c, unitPrice: v })} ariaLabel="Jednotková cena" />
      </span>
    )
  return (
    <span className="flex items-center gap-1">
      <NumInput cell decimals={2} value={c.pct} onChange={(v) => onChange({ ...c, pct: v })} ariaLabel="Percento" />
      <span className="shrink-0 text-[12px] text-muted">% z</span>
      <Select
        cell
        value={c.base}
        onChange={(v) => onChange({ ...c, base: v })}
        ariaLabel="Základ"
        options={[
          { value: 'construction', label: 'stavby' },
          { value: 'revenue', label: 'tržieb' },
          { value: 'land', label: 'pozemku' },
        ]}
      />
    </span>
  )
}

function TimingEditor({ item, onChange }: { item: CostItem; onChange: (t: CostTiming) => void }) {
  const { data, r } = useStore()
  const t = item.timing
  if (item.calc.kind === 'boq') return <span className="text-muted">podľa harmonogramu oddielov</span>
  const setMode = (mode: CostTiming['mode']) => {
    if (mode === 'month') onChange({ mode, month: 0 })
    else if (mode === 'range') onChange({ mode, start: 0, months: 12 })
    else if (mode === 'phase') onChange({ mode, phaseId: data.phases[0]?.id ?? '' })
    else onChange({ mode })
  }
  return (
    <span className="flex items-center gap-1">
      <Select cell value={t.mode} onChange={setMode} ariaLabel="Spôsob časovania" options={Object.entries(TIMING_LABEL).map(([value, label]) => ({ value: value as CostTiming['mode'], label }))} />
      {t.mode === 'month' && <MonthSelect value={t.month} onChange={(v) => onChange({ ...t, month: v })} count={r.n + 6} startMonth={data.settings.startMonth} ariaLabel="Mesiac" />}
      {t.mode === 'range' && (
        <>
          <MonthSelect value={t.start} onChange={(v) => onChange({ ...t, start: v })} count={r.n + 6} startMonth={data.settings.startMonth} ariaLabel="Začiatok" />
          <NumInput cell value={t.months} min={1} onChange={(v) => onChange({ ...t, months: Math.round(v) })} ariaLabel="Počet mesiacov" />
          <span className="shrink-0 text-[12px] text-muted">mes.</span>
        </>
      )}
      {t.mode === 'phase' && <Select cell value={t.phaseId} onChange={(v) => onChange({ ...t, phaseId: v })} ariaLabel="Fáza" options={data.phases.map((p) => ({ value: p.id, label: p.name }))} />}
    </span>
  )
}

function Budget() {
  const { data, r, patch, add, remove } = useStore()
  const lineOf = new Map(r.costs.lines.map((l) => [l.item.id, l]))

  const csv = () =>
    exportCsv('rozpocet-nakladov.csv', [
      ['Skupina', 'Položka', 'Plán €', 'Zazmluvnené €', 'Uhradené €', 'Zostáva uhradiť €', 'Poznámka'],
      ...r.costs.lines.map((l) => [COST_GROUPS.find((g) => g.id === l.item.group)?.name ?? '', l.item.name, l.plan, l.item.contracted, l.item.paid, l.plan - l.item.paid, l.item.note]),
      ['', 'Financovanie (úroky a poplatky)', r.finance.cost, '', '', '', ''],
      ['', 'SPOLU', r.kpi.totalCost, r.costs.contracted, r.costs.paid, r.kpi.totalCost - r.costs.paid, ''],
    ])

  return (
    <Card
      title="Rozpočet nákladov"
      hint="Plán sa počíta zo zadaného spôsobu výpočtu. Zazmluvnené a uhradené sumy dopĺňajte priebežne – rozdiel ukazuje, čo ešte treba zaplatiť."
      action={<Button size="sm" icon={<Download size={15} />} onClick={csv}>Export CSV</Button>}
      pad={false}
    >
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Položka</th>
              <th>Výpočet</th>
              <th className="num">Plán</th>
              <th className="num">Zazmluvnené</th>
              <th className="num">Uhradené</th>
              <th className="num">Zostáva</th>
              <th>Časovanie</th>
              <th>Poznámka</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {COST_GROUPS.map((g) => {
              const total = r.costs.groups.find((x) => x.id === g.id)
              const items = data.costs.filter((c) => c.group === g.id)
              return [
                <tr key={g.id} className="group">
                  <td colSpan={2}>
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: GROUP_COLOR[g.id] }} />
                      {g.name}
                    </span>
                  </td>
                  <td className="num">{eur(total?.plan ?? 0)}</td>
                  <td className="num">{eur(total?.contracted ?? 0)}</td>
                  <td className="num">{eur(total?.paid ?? 0)}</td>
                  <td className="num">{eur((total?.plan ?? 0) - (total?.paid ?? 0))}</td>
                  <td colSpan={3}>
                    <span className="no-print">
                      <Button
                        size="sm"
                        icon={<Plus size={14} />}
                        onClick={() => add('costs', { id: uid('cost'), group: g.id, name: 'Nová položka', calc: { kind: 'fixed', amount: 0 }, timing: { mode: 'construction' }, contracted: 0, paid: 0, note: '' })}
                      >
                        Položka
                      </Button>
                    </span>
                  </td>
                </tr>,
                ...items.map((c) => {
                  const plan = lineOf.get(c.id)?.plan ?? 0
                  const system = c.calc.kind === 'land' || c.calc.kind === 'boq'
                  return (
                    <tr key={c.id}>
                      <td style={{ minWidth: 260 }}><TextInput cell value={c.name} onChange={(v) => patch('costs', c.id, { name: v })} ariaLabel="Názov položky" /></td>
                      <td style={{ minWidth: 230 }}>
                        <span className="flex items-center gap-1">
                          {!system && (
                            <Select
                              cell
                              value={c.calc.kind}
                              ariaLabel="Spôsob výpočtu"
                              onChange={(k) => {
                                const next: CostCalc =
                                  k === 'fixed' ? { kind: 'fixed', amount: Math.round(plan) }
                                  : k === 'qty' ? { kind: 'qty', qty: 1, unit: 'ks', unitPrice: Math.round(plan) }
                                  : k === 'monthly' ? { kind: 'monthly', amount: 0 }
                                  : { kind: 'pct', base: 'construction', pct: 1 }
                                patch('costs', c.id, { calc: next })
                              }}
                              options={[
                                { value: 'fixed', label: 'Suma' },
                                { value: 'qty', label: 'Množstvo' },
                                { value: 'pct', label: 'Percento' },
                                { value: 'monthly', label: 'Mesačne' },
                              ]}
                            />
                          )}
                          <CalcEditor item={c} onChange={(calc) => patch('costs', c.id, { calc })} />
                        </span>
                      </td>
                      <td className="num font-medium">{eur(plan)}</td>
                      <td className="num" style={{ minWidth: 104 }}><NumInput cell value={c.contracted} onChange={(v) => patch('costs', c.id, { contracted: v })} ariaLabel="Zazmluvnené" /></td>
                      <td className="num" style={{ minWidth: 104 }}><NumInput cell value={c.paid} onChange={(v) => patch('costs', c.id, { paid: v })} ariaLabel="Uhradené" /></td>
                      <td className={cx('num', plan - c.paid < -1 && 'text-crit-ink')}>{eur(plan - c.paid)}</td>
                      <td style={{ minWidth: 250 }}><TimingEditor item={c} onChange={(timing) => patch('costs', c.id, { timing })} /></td>
                      <td style={{ minWidth: 260 }}><TextInput cell value={c.note} onChange={(v) => patch('costs', c.id, { note: v })} ariaLabel="Poznámka" /></td>
                      <td>{!system && <IconButton title="Odstrániť položku" tone="crit" onClick={() => remove('costs', c.id)}><Trash2 size={15} /></IconButton>}</td>
                    </tr>
                  )
                }),
              ]
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Náklady bez financovania</td>
              <td className="num">{eur(r.costs.total)}</td>
              <td className="num">{eur(r.costs.contracted)}</td>
              <td className="num">{eur(r.costs.paid)}</td>
              <td className="num">{eur(r.costs.total - r.costs.paid)}</td>
              <td colSpan={3} />
            </tr>
            <tr>
              <td colSpan={2}>Financovanie (úroky a poplatky)</td>
              <td className="num">{eur(r.finance.cost)}</td>
              <td colSpan={6} className="font-normal text-muted">vypočítané z úveru v záložke Financovanie</td>
            </tr>
            <tr>
              <td colSpan={2}>Náklady spolu</td>
              <td className="num">{eur(r.kpi.totalCost)}</td>
              <td colSpan={6} />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

// ───────────────────────── Cash-flow ─────────────────────────

function Cash() {
  const { data, r } = useStore()
  const sm = data.settings.startMonth
  const labels = useMemo(() => Array.from({ length: r.n }, (_, i) => monthShort(sm, i)), [r.n, sm])
  const groups = COST_GROUPS.filter((g) => r.cash.outByGroup[g.id].some((v) => v > 0))

  const tableRows: { label: string; values: number[]; strong?: boolean; sign?: 1 | -1 }[] = [
    { label: 'Príjmy z predaja (bez DPH)', values: r.cash.inflow, strong: true },
    ...groups.map((g) => ({ label: g.name, values: r.cash.outByGroup[g.id], sign: -1 as const })),
    { label: 'Výdavky spolu', values: r.cash.outflow, strong: true, sign: -1 },
    { label: 'Čistý tok', values: r.cash.net, strong: true },
    { label: 'Kumulatívny tok', values: r.cash.cum, strong: true },
    { label: 'Vklad vlastných zdrojov', values: r.finance.equityIn },
    { label: 'Výplata investorovi', values: r.finance.equityOut },
    { label: 'Čerpanie úveru', values: r.finance.loanDraw },
    { label: 'Splátka úveru', values: r.finance.loanRepay },
    { label: 'Úroky', values: r.finance.interestM, sign: -1 },
    { label: 'Zostatok úveru', values: r.finance.loanBal },
  ]

  const csv = () =>
    exportCsv('cash-flow.csv', [
      ['Položka', ...Array.from({ length: r.n }, (_, i) => monthLabel(sm, i)), 'Spolu'],
      ...tableRows.map((x) => [x.label, ...x.values.map((v) => v * (x.sign ?? 1)), x.label.startsWith('Kumul') || x.label.startsWith('Zostatok') ? '' : x.values.reduce((a, b) => a + b, 0) * (x.sign ?? 1)]),
    ])

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Mesačné výdavky podľa skupín" hint="Bez financovania">
          <ColumnChart
            mode="stacked"
            ariaLabel="Mesačné výdavky projektu podľa skupín nákladov"
            labels={labels}
            format={eur}
            marker={{ index: r.nowIdx, label: 'dnes' }}
            series={groups.map((g) => ({ name: g.name, color: GROUP_COLOR[g.id], values: r.cash.outByGroup[g.id] }))}
          />
        </Card>
        <Card title="Čistý mesačný tok" hint="Príjmy z predaja mínus výdavky">
          <ColumnChart
            mode="diverging"
            ariaLabel="Čistý mesačný peňažný tok"
            labels={labels}
            format={eur}
            posLabel="Príjmy prevyšujú výdavky"
            negLabel="Výdavky prevyšujú príjmy"
            marker={{ index: r.nowIdx, label: 'dnes' }}
            series={[{ name: 'Čistý tok', color: SERIES[0], values: r.cash.net }]}
          />
        </Card>
      </div>

      <Card title="Kumulatívny peňažný tok" hint="Najnižší bod ukazuje maximálnu potrebu financovania bez úveru">
        <LineChart
          ariaLabel="Kumulatívny peňažný tok projektu"
          labels={labels}
          format={eur}
          marker={{ index: r.nowIdx, label: 'dnes' }}
          series={[{ name: 'Kumulatívny tok', color: SERIES[0], values: r.cash.cum }]}
        />
      </Card>

      <Card title="Tabuľka peňažných tokov" action={<Button size="sm" icon={<Download size={15} />} onClick={csv}>Export CSV</Button>} pad={false}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="sticky left-0 z-[1]" style={{ minWidth: 190 }}>Položka</th>
                {labels.map((l, i) => (
                  <th key={i} className="num" title={monthLabel(sm, i)}>{l}</th>
                ))}
                <th className="num">Spolu</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((x) => {
                const running = x.label.startsWith('Kumul') || x.label.startsWith('Zostatok')
                return (
                  <tr key={x.label} className={x.strong ? 'total' : undefined}>
                    <td className="sticky left-0 z-[1] bg-surface" style={x.strong ? { background: 'var(--surface-2)' } : undefined}>{x.label}</td>
                    {x.values.map((v, i) => {
                      const val = v * (x.sign ?? 1)
                      return (
                        <td key={i} className={cx('num', val < -0.5 && 'text-crit-ink', Math.abs(val) < 0.5 && 'text-muted')}>
                          {Math.abs(val) < 0.5 ? '·' : num(val / 1000, 0)}
                        </td>
                      )
                    })}
                    <td className="num">{running ? '' : num((x.values.reduce((a, b) => a + b, 0) * (x.sign ?? 1)) / 1000, 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="m-0 px-4 py-3 text-[12.5px] text-muted sm:px-5">Hodnoty v tabuľke sú v tisícoch eur.</p>
      </Card>
    </div>
  )
}

// ───────────────────────── Financovanie ─────────────────────────

function Finance() {
  const { data, r, setSettings } = useStore()
  const f = data.settings.finance
  const sm = data.settings.startMonth
  const labels = useMemo(() => Array.from({ length: r.n }, (_, i) => monthShort(sm, i)), [r.n, sm])
  const upd = (x: Partial<typeof f>) => setSettings((s) => ({ ...s, finance: { ...s.finance, ...x } }))
  const minCum = Math.min(0, ...r.cash.cum)
  const needEquity = useMemo(() => minEquity(data), [data])

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Zdroje financovania">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dostupné vlastné zdroje" hint="Vrátane už zaplateného pozemku."><NumInput value={f.equity} onChange={(v) => upd({ equity: v })} suffix="€" /></Field>
            <Field label="Úverový rámec" hint="0 = bez úveru."><NumInput value={f.loanLimit} onChange={(v) => upd({ loanLimit: v })} suffix="€" /></Field>
            <Field label="Úroková sadzba"><NumInput decimals={2} value={f.interestPct} onChange={(v) => upd({ interestPct: v })} suffix="% p. a." /></Field>
            <Field label="Poplatok za poskytnutie"><NumInput decimals={2} value={f.feePct} onChange={(v) => upd({ feePct: v })} suffix="%" /></Field>
          </div>
          <div className="mt-4">
            <Note>
              Model čerpá najprv vlastné zdroje, potom úver. Príjmy z predaja najprv splácajú úver; až potom sa vyplácajú
              investorovi, pričom sa ponecháva rezerva na budúce výdavky. Úroky sa platia mesačne zo zostatku úveru.
            </Note>
          </div>
        </Card>

        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Najviac viazané vlastné zdroje" value={eurShort(r.finance.peakEquity)} sub={`dostupné ${eurShort(f.equity)}`} />
            <Stat label="Najvyšší zostatok úveru" value={eurShort(r.finance.peakLoan)} sub={`rámec ${eurShort(f.loanLimit)}`} />
            <Stat label="Minimum vlastných zdrojov" value={eurShort(needEquity)} sub={`pri úvere do ${eurShort(f.loanLimit)}`} tone={needEquity > f.equity ? 'crit' : 'neutral'} />
            <Stat label="Potreba bez úveru" value={eurShort(-minCum)} sub="najnižší kumulatívny tok" />
            <Stat label="Úroky" value={eur(r.finance.interest)} />
            <Stat label="Poplatok banke" value={eur(r.finance.fee)} />
            <Stat label="Nekrytá potreba" value={eur(r.finance.gap)} tone={r.finance.gap > 1 ? 'crit' : 'good'} sub={r.finance.gap > 1 ? 'zdroje nestačia' : 'zdroje stačia'} />
          </div>
          {r.finance.gap > 1 && (
            <Note tone="warn" title="Zdroje nepokrývajú výdavky">
              Chýba {eur(r.finance.gap)}. Zvýšte vlastné zdroje alebo úverový rámec, zrýchlite predpredaj, alebo stavajte domy po etapách (Karta projektu → posun začiatku).
            </Note>
          )}
        </div>
      </div>

      <Card title="Vlastné zdroje a úver v čase">
        <LineChart
          ariaLabel="Viazané vlastné zdroje, zostatok úveru a hotovosť projektu v čase"
          labels={labels}
          format={eur}
          marker={{ index: r.nowIdx, label: 'dnes' }}
          series={[
            { name: 'Viazané vlastné zdroje', color: SERIES[1], values: r.finance.equityOutstanding },
            { name: 'Zostatok úveru', color: SERIES[2], values: r.finance.loanBal },
            { name: 'Hotovosť projektu', color: SERIES[0], values: r.finance.cashBal },
          ]}
        />
      </Card>
    </div>
  )
}

// ───────────────────────── Scenáre a citlivosť ─────────────────────────

const PRICE_STEPS = [-15, -10, -5, 0, 5, 10, 15]
const COST_STEPS = [-10, -5, 0, 5, 10, 15, 20]
const LAND_STEPS = [-40, -30, -20, -10, 0, 10]

function tint(v: number, max: number): string {
  const k = Math.min(1, Math.abs(v) / (max || 1))
  const color = v >= 0 ? 'var(--pos)' : 'var(--neg)'
  return `color-mix(in srgb, ${color} ${Math.round(8 + k * 34)}%, var(--surface))`
}

function Scenarios() {
  const { data, setSettings } = useStore()
  const scenarios = data.settings.scenarios
  const results = useMemo(() => scenarios.map((sc) => compute(data, scenarioAdj(sc))), [data, scenarios])
  const matrix = useMemo(() => sensitivity(data, PRICE_STEPS, COST_STEPS), [data])
  const landRow = useMemo(() => LAND_STEPS.map((d) => compute(data, { ...NO_ADJ, landDeltaPct: d }).kpi), [data])
  const maxAbs = Math.max(1, ...matrix.flat().map((c) => Math.abs(c.profit)))
  const maxLand = Math.max(1, ...landRow.map((k) => Math.abs(k.profit)))

  const upd = (id: string, x: Partial<Scenario>) => setSettings((s) => ({ ...s, scenarios: s.scenarios.map((sc) => (sc.id === id ? { ...sc, ...x } : sc)) }))
  const addSc = () => setSettings((s) => ({ ...s, scenarios: [...s.scenarios, { id: uid('sc'), name: 'Nový scenár', priceDeltaPct: 0, constructionDeltaPct: 0, delayMonths: 0, salesShiftMonths: 0, interestDeltaPp: 0 }] }))
  const delSc = (id: string) => setSettings((s) => ({ ...s, scenarios: s.scenarios.filter((sc) => sc.id !== id) }))

  return (
    <div className="grid gap-4">
      <Card title="Scenáre" hint="Zmeny oproti základným predpokladom. Zmena cien sa týka len nepredaných jednotiek." action={<Button size="sm" icon={<Plus size={15} />} onClick={addSc}>Scenár</Button>} pad={false}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Scenár</th>
                <th className="num">Ceny %</th>
                <th className="num">Stavba %</th>
                <th className="num">Meškanie mes.</th>
                <th className="num">Posun predaja mes.</th>
                <th className="num">Úrok p. b.</th>
                <th className="num">Tržby bez DPH</th>
                <th className="num">Náklady</th>
                <th className="num">Zisk</th>
                <th className="num">Marža</th>
                <th className="num">IRR vl. zdrojov</th>
                <th className="num">Vlastné zdroje</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scenarios.map((sc, i) => {
                const k: Results = results[i]
                return (
                  <tr key={sc.id}>
                    <td style={{ minWidth: 130 }}><TextInput cell value={sc.name} onChange={(v) => upd(sc.id, { name: v })} ariaLabel="Názov scenára" /></td>
                    <td style={{ minWidth: 70 }}><NumInput cell decimals={1} value={sc.priceDeltaPct} onChange={(v) => upd(sc.id, { priceDeltaPct: v })} ariaLabel="Zmena cien" /></td>
                    <td style={{ minWidth: 70 }}><NumInput cell decimals={1} value={sc.constructionDeltaPct} onChange={(v) => upd(sc.id, { constructionDeltaPct: v })} ariaLabel="Zmena stavebných nákladov" /></td>
                    <td style={{ minWidth: 70 }}><NumInput cell value={sc.delayMonths} min={0} onChange={(v) => upd(sc.id, { delayMonths: Math.round(v) })} ariaLabel="Meškanie výstavby" /></td>
                    <td style={{ minWidth: 70 }}><NumInput cell value={sc.salesShiftMonths} onChange={(v) => upd(sc.id, { salesShiftMonths: Math.round(v) })} ariaLabel="Posun konca predaja" /></td>
                    <td style={{ minWidth: 70 }}><NumInput cell decimals={2} value={sc.interestDeltaPp} onChange={(v) => upd(sc.id, { interestDeltaPp: v })} ariaLabel="Zmena úroku" /></td>
                    <td className="num">{eurShort(k.revenue.net)}</td>
                    <td className="num">{eurShort(k.kpi.totalCost)}</td>
                    <td className={cx('num font-semibold', k.kpi.profit < 0 && 'text-crit-ink')}>{eurShort(k.kpi.profit)}</td>
                    <td className="num">{pct(k.kpi.marginRevenue)}</td>
                    <td className="num">{k.kpi.irrEquity === null ? '—' : pct(k.kpi.irrEquity * 100)}</td>
                    <td className="num">{eurShort(k.finance.peakEquity)}</td>
                    <td><IconButton title="Odstrániť scenár" tone="crit" onClick={() => delSc(sc.id)}><Trash2 size={15} /></IconButton></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Citlivosť zisku na predajné ceny a stavebné náklady" hint="Zisk pred zdanením; v zátvorke marža z tržieb. Modrá = zisk, červená = strata." pad={false}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Stavebné náklady ↓ / Ceny →</th>
                {PRICE_STEPS.map((p) => (
                  <th key={p} className="num">{p > 0 ? '+' : ''}{p} %</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COST_STEPS.map((c, ri) => (
                <tr key={c}>
                  <td className="font-medium">{c > 0 ? '+' : ''}{c} %</td>
                  {matrix[ri].map((cell, ci) => (
                    <td key={ci} className="num" style={{ background: tint(cell.profit, maxAbs), outline: c === 0 && PRICE_STEPS[ci] === 0 ? '2px solid var(--ink)' : undefined, outlineOffset: -2 }}>
                      <span className="font-semibold">{eurShort(cell.profit)}</span>
                      <span className="block text-[11.5px] text-ink-2">{pct(cell.margin)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Citlivosť zisku na cenu pozemku" pad={false}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Cena pozemku</th>
                {LAND_STEPS.map((d) => (
                  <th key={d} className="num">{d > 0 ? '+' : ''}{d} %</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Zisk pred zdanením</td>
                {landRow.map((k, i) => (
                  <td key={i} className="num" style={{ background: tint(k.profit, maxLand), outline: LAND_STEPS[i] === 0 ? '2px solid var(--ink)' : undefined, outlineOffset: -2 }}>
                    <span className="font-semibold">{eurShort(k.profit)}</span>
                    <span className="block text-[11.5px] text-ink-2">{pct(k.marginRevenue)}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ───────────────────────── Stratégie ─────────────────────────

function Strategies() {
  const { data, r, setSettings } = useStore()
  const a = data.settings.rent
  const rent = rentStrategy(data, r)
  const exit = landExit(data, r)
  const upd = (x: Partial<typeof a>) => setSettings((s) => ({ ...s, rent: { ...s.rent, ...x } }))
  const months = Math.max(0, r.ms.handover + 2 - r.nowIdx)

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="A. Postaviť a predať" hint="Základný model projektu">
          <div className="grid gap-2 text-[13.5px]">
            <Row k="Zisk pred zdanením" v={eur(r.kpi.profit)} strong tone={r.kpi.profit < 0 ? 'crit' : undefined} />
            <Row k="Čistý zisk" v={eur(r.kpi.netProfit)} />
            <Row k="Marža z tržieb" v={pct(r.kpi.marginRevenue)} />
            <Row k="Viazané vlastné zdroje" v={eur(r.finance.peakEquity)} />
            <Row k="Výnos vlastných zdrojov" v={r.kpi.irrEquity === null ? '—' : `${pct(r.kpi.irrEquity * 100)} ročne`} />
            <Row k="Do odovzdania bytov" v={`${months} mesiacov`} />
          </div>
        </Card>

        <Card title="B. Postaviť a prenajímať" hint="Krátkodobý prenájom všetkých bytov">
          <div className="grid gap-2 text-[13.5px]">
            <Row k="Tržby z prenájmu" v={`${eur(rent.revenue)} ročne`} />
            <Row k="Prevádzkové náklady" v={`${eur(rent.costs)} ročne`} />
            <Row k="Čistý prevádzkový výnos" v={`${eur(rent.noi)} ročne`} strong />
            <Row k="Výnos na náklady projektu" v={pct(rent.yieldOnCost, 2)} tone={rent.yieldOnCost < data.settings.finance.interestPct ? 'crit' : undefined} />
            <Row k={`Hodnota pri výnosovej miere ${pct(a.capRatePct)}`} v={eur(rent.value)} />
            <Row k="Hodnota mínus náklady" v={eur(rent.valueGain)} tone={rent.valueGain < 0 ? 'crit' : undefined} />
          </div>
        </Card>

        <Card title="C. Predať pozemok s povolením" hint="Bez výstavby">
          <div className="grid gap-2 text-[13.5px]">
            <Field label="Predajná cena pozemku">
              <NumInput value={data.settings.landExitPerM2} onChange={(v) => setSettings((s) => ({ ...s, landExitPerM2: v }))} suffix="€/m²" />
            </Field>
            <Row k="Výnos z predaja" v={eur(exit.proceeds)} />
            <Row k="Doteraz vložené" v={eur(exit.invested)} />
            <Row k="Výsledok" v={eur(exit.profit)} strong tone={exit.profit < 0 ? 'crit' : undefined} />
          </div>
          <p className="mb-0 mt-3 text-[12.5px] text-muted">Bez daní a provízií z predaja. Vložené = pozemok a ostatné už uhradené náklady.</p>
        </Card>
      </div>

      <Card title="Predpoklady prenájmu" hint="Upravte podľa vlastných údajov – východiskové hodnoty sú orientačné.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cena za noc – 1 spálňa"><NumInput value={a.adr1} onChange={(v) => upd({ adr1: v })} suffix="€" /></Field>
          <Field label="Cena za noc – 2 spálne"><NumInput value={a.adr2} onChange={(v) => upd({ adr2: v })} suffix="€" /></Field>
          <Field label="Cena za noc – so strešnou terasou"><NumInput value={a.adr2roof} onChange={(v) => upd({ adr2roof: v })} suffix="€" /></Field>
          <Field label="Obsadené noci za rok"><NumInput value={a.nights} min={0} max={365} onChange={(v) => upd({ nights: v })} /></Field>
          <Field label="Provízie a správa" hint="Platformy a správcovská firma."><NumInput decimals={1} value={a.feesPct} onChange={(v) => upd({ feesPct: v })} suffix="% z tržieb" /></Field>
          <Field label="Náklady na byt ročne" hint="Energie, údržba, poistenie, dane."><NumInput value={a.costPerUnitYear} onChange={(v) => upd({ costPerUnitYear: v })} suffix="€" /></Field>
          <Field label="Výnosová miera pre ocenenie"><NumInput decimals={2} value={a.capRatePct} onChange={(v) => upd({ capRatePct: v })} suffix="%" /></Field>
        </div>
        <div className="mt-4">
          <Note>
            Porovnanie je orientačné: pri držbe sa neráta daň z príjmov, odpisy ani vrátenie odpočítanej DPH pri neskoršom
            predaji. Medzi stratégiami sú aj kombinácie – napríklad predať časť bytov a zvyšok držať, alebo stavať domy po
            etapách a ďalší dom začať až z výnosov predchádzajúceho (Karta projektu → posun začiatku výstavby).
          </Note>
        </div>
      </Card>
    </div>
  )
}

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: 'crit' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-ink-2">{k}</span>
      <span className={cx('text-right tabular-nums', strong ? 'text-[15px] font-semibold' : 'font-medium', tone === 'crit' && 'text-crit-ink')}>{v}</span>
    </div>
  )
}

// ───────────────────────── Predpoklady ─────────────────────────

function Assumptions() {
  const { data, r, setSettings } = useStore()
  const s = data.settings
  const sales = s.sales
  const updSales = (x: Partial<typeof sales>) =>
    setSettings((st) => {
      const next = { ...st.sales, ...x }
      next.finalPct = Math.max(0, 100 - next.depositPct - next.shellPct)
      return { ...st, sales: next }
    })
  const monthOpts = Array.from({ length: Math.max(r.n + 12, sales.endMonth + 1) }, (_, i) => ({ value: String(i), label: monthLabel(s.startMonth, i) }))
  const free = data.units.filter((u) => !isSold(u)).length
  const span = Math.max(1, sales.endMonth - Math.max(sales.startMonth, r.nowIdx))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Predaj" hint="Tempo predaja voľných jednotiek a štandardný splátkový kalendár">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Začiatok predpredaja">
            <Select value={String(sales.startMonth)} onChange={(v) => updSales({ startMonth: Number(v) })} options={monthOpts} />
          </Field>
          <Field label="Všetko predané do">
            <Select value={String(sales.endMonth)} onChange={(v) => updSales({ endMonth: Number(v) })} options={monthOpts} />
          </Field>
          <Field label="Záloha pri podpise"><NumInput decimals={1} min={0} max={100} value={sales.depositPct} onChange={(v) => updSales({ depositPct: v })} suffix="%" /></Field>
          <Field label="Splátka po hrubej stavbe"><NumInput decimals={1} min={0} max={100} value={sales.shellPct} onChange={(v) => updSales({ shellPct: v })} suffix="%" /></Field>
          <Field label="Doplatok pri odovzdaní" hint="Dopočíta sa do 100 %.">
            <div className="inp flex items-center justify-end bg-surface-2 tabular-nums">{num(sales.finalPct, 1)} %</div>
          </Field>
        </div>
        <div className="mt-4">
          <Note>
            Voľných jednotiek: {free}. Pri rovnomernom predaji to znamená približne {num(free / span, 1)} bytu mesačne.
            Jednotky s rezerváciou alebo zmluvou sa počítajú podľa skutočného dátumu a splátkového kalendára.
          </Note>
        </div>
      </Card>

      <Card title="Dane">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="DPH pri predaji novostavby"><NumInput decimals={1} value={s.vatPct} onChange={(v) => setSettings((st) => ({ ...st, vatPct: v }))} suffix="%" /></Field>
          <Field label="Daň z príjmov právnických osôb"><NumInput decimals={1} value={s.profitTaxPct} onChange={(v) => setSettings((st) => ({ ...st, profitTaxPct: v }))} suffix="%" /></Field>
        </div>
        <div className="mt-3">
          <Check checked={s.pricesIncludeVat} onChange={(v) => setSettings((st) => ({ ...st, pricesIncludeVat: v }))} label="Ceny v cenníku sú vrátane DPH" />
        </div>
        <div className="mt-4 grid gap-2">
          <Note>
            Prvý predaj novostavby platiteľom DPH podlieha DPH; kupujúci vtedy neplatí daň z prevodu nehnuteľností. Stavebné
            práce medzi platiteľmi idú v režime prenesenia daňovej povinnosti. Daň z prevodu pri kúpe pozemku nastavíte v
            Rozpočte nákladov (0 %, ak bol pozemok kúpený s DPH).
          </Note>
          <Badge tone="warn">Daňový režim si pred prvou predzmluvou potvrďte u daňového poradcu v Chorvátsku.</Badge>
        </div>
      </Card>
    </div>
  )
}
