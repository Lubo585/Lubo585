import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { breakeven, isSold, sellableArea } from '../lib/calc'
import { addYears, daysUntil, eur, eurShort, fmtDate, monthLabel, monthShort, num, pct } from '../lib/format'
import { coverOf, useMediaVersion } from '../lib/media'
import { useStore } from '../store'
import { SERIES } from '../ui/chartUtils'
import { BarList, LineChart, SegBar } from '../ui/charts'
import { CoverArt } from '../ui/CoverArt'
import { Badge, Card, LinkButton, Meter, Note, Stat } from '../ui/kit'
import { Num } from '../ui/Num'
import { PIPELINE, riskTone, UNIT_STATUS, UNIT_STATUS_ORDER } from '../ui/labels'

export default function Dashboard() {
  const { data, r } = useStore()
  const s = data.settings
  const labels = useMemo(() => Array.from({ length: r.n }, (_, i) => monthShort(s.startMonth, i)), [r.n, s.startMonth])

  const be = useMemo(
    () => ({
      price: data.units.some((u) => !isSold(u)) ? breakeven(data, 'priceDeltaPct') : null,
      land: breakeven(data, 'landDeltaPct', undefined, undefined, -100, 300),
      build: breakeven(data, 'constructionDeltaPct', undefined, undefined, -90, 300),
    }),
    [data],
  )

  const land = r.costs.groups.find((g) => g.id === 'land')?.plan ?? 0
  const landArea = data.parcels.reduce((a, p) => a + p.area, 0)
  const landPerM2 = landArea > 0 ? data.parcels.reduce((a, p) => a + p.area * p.pricePerM2, 0) / landArea : 0
  const loss = r.kpi.profit < 0

  const deadline = data.project.permitFinalDate ? addYears(data.project.permitFinalDate, data.project.permitValidYears) : null
  const deadlineDays = daysUntil(deadline)

  const tasks = data.tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.priority - b.priority)
    .slice(0, 6)
  const risks = data.risks
    .filter((x) => x.status !== 'closed')
    .sort((a, b) => b.probability * b.impact - a.probability * a.impact)
    .slice(0, 5)
  const permitsDone = data.permits.filter((p) => p.status === 'done').length
  const permitsAll = data.permits.filter((p) => p.status !== 'na').length
  const completion = r.phases.find((p) => p.tag === 'completion')
  const activeClients = data.clients.filter((c) => c.stage !== 'lost')
  useMediaVersion()
  const cover = coverOf(data.media)
  const area = data.units.reduce((a, u) => a + sellableArea(u, s), 0)
  const houses = data.buildings.length

  return (
    <>
      <section className="hero mb-5">
        <div className="relative z-[1] grid items-end gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 lg:p-10">
          <div className="min-w-0">
            <p className="m-0 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-accent">{data.project.location}</p>
            <h1 className="m-0 mt-2 text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[54px]">{data.project.name}</h1>
            <p className="m-0 mt-3 max-w-md text-[15.5px] leading-snug text-ink-2">{data.project.stage}</p>
            <dl className="m-0 mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ['Jednotky', String(data.units.length)],
                ['Domy', String(houses)],
                ['Predajná plocha', `${num(area, 0)} m²`],
                ['Odovzdanie', monthLabel(s.startMonth, r.ms.handover)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-muted">{k}</dt>
                  <dd className="m-0 text-[19px] font-semibold tracking-[-0.02em]">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="no-print mt-7 flex flex-wrap gap-2">
              <LinkButton href="#ekonomika" variant="primary" icon={<ArrowRight size={15} aria-hidden />}>Ekonomika</LinkButton>
              <LinkButton href="#galeria">Galéria</LinkButton>
            </div>
          </div>
          <a href="#galeria" aria-label="Otvoriť galériu" className="relative block h-[150px] text-ink-2 sm:h-[200px] lg:h-[260px]">
            <CoverArt item={cover} className="absolute inset-0 h-full w-full" position="center bottom" />
          </a>
        </div>
      </section>

      {loss && (
        <div className="mb-4">
          <Note tone="crit" title="Pri aktuálnych predpokladoch projekt končí stratou">
            Zisk pred zdanením vychádza {eur(r.kpi.profit)} (marža {pct(r.kpi.marginRevenue)} z tržieb). Čísla stoja na
            predpokladoch o cene pozemku, stavebných nákladoch a predajných cenách – spresnite ich v Karte projektu, vo
            Výkaze výmer a v Cenníku. Nižšie vidíte, čo by muselo platiť, aby projekt vyšiel aspoň na nulu.
          </Note>
        </div>
      )}
      {r.finance.gap > 1 && (
        <div className="mb-4">
          <Note tone="warn" title="Zdroje nepokrývajú potrebu financovania">
            Nad rámec vlastných zdrojov a úveru chýba {eur(r.finance.gap)}. Upravte financovanie v časti Ekonomika.
          </Note>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-6">
        <Stat label="Tržby bez DPH" value={<Num value={r.revenue.net} format={eurShort} />} sub={`${eurShort(r.revenue.gross)} s DPH`} />
        <Stat label="Náklady spolu" value={<Num value={r.kpi.totalCost} format={eurShort} />} sub={`pozemok ${pct(r.kpi.totalCost > 0 ? (land / r.kpi.totalCost) * 100 : 0, 0)}`} />
        <Stat label="Zisk pred zdanením" value={<Num value={r.kpi.profit} format={eurShort} />} tone={loss ? 'crit' : 'good'} sub={`marža ${pct(r.kpi.marginRevenue)} z tržieb`} />
        <Stat label="Viazané vlastné zdroje" value={<Num value={r.finance.peakEquity} format={eurShort} />} sub={`úver najviac ${eurShort(r.finance.peakLoan)}`} />
        <Stat label="Predané a rezervované" value={`${r.revenue.soldCount} / ${data.units.length}`} sub={`zazmluvnené ${eurShort(r.revenue.soldGross)}`} />
        <Stat
          label="Výnos vlastných zdrojov"
          value={r.kpi.irrEquity === null ? '—' : <Num value={r.kpi.irrEquity * 100} format={(v) => pct(v)} />}
          sub={`ročne (IRR) · ROE ${pct(r.kpi.roe)}`}
          tone={r.kpi.irrEquity !== null && r.kpi.irrEquity < 0 ? 'crit' : 'neutral'}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Peňažné toky projektu" hint="Kumulatívny tok bez financovania, viazané vlastné zdroje a čerpaný úver">
          <LineChart
            ariaLabel="Kumulatívny peňažný tok projektu po mesiacoch"
            labels={labels}
            format={eur}
            marker={{ index: r.nowIdx, label: 'dnes' }}
            series={[
              { name: 'Kumulatívny tok projektu', color: SERIES[0], values: r.cash.cum },
              { name: 'Viazané vlastné zdroje', color: SERIES[1], values: r.finance.equityOutstanding },
              { name: 'Čerpaný úver', color: SERIES[2], values: r.finance.loanBal },
            ]}
          />
          <p className="mt-2 text-[12.5px] text-muted">
            Mesačné hodnoty sú v časti <a href="#ekonomika">Ekonomika → Cash-flow</a>.
          </p>
        </Card>

        <Card title="Čo musí platiť, aby projekt vyšiel na nulu" hint="Každá páka samostatne, ostatné predpoklady bez zmeny">
          <ul className="m-0 grid list-none gap-3 p-0 text-[13.5px]">
            <li>
              <div className="text-muted">Priemerná predajná cena</div>
              <div className="text-[18px] font-semibold">
                {be.price === null ? '—' : `${eur(r.revenue.avgPerM2 * (1 + be.price / 100))}/m²`}
                {be.price !== null && <span className="ml-2 text-[13px] font-normal text-ink-2">({be.price >= 0 ? '+' : ''}{pct(be.price)} oproti cenníku {eur(r.revenue.avgPerM2)}/m²)</span>}
              </div>
            </li>
            <li>
              <div className="text-muted">Cena pozemku</div>
              <div className="text-[18px] font-semibold">
                {be.land === null ? '—' : `${eur(landPerM2 * (1 + be.land / 100))}/m²`}
                {be.land !== null && <span className="ml-2 text-[13px] font-normal text-ink-2">({be.land >= 0 ? '+' : ''}{pct(be.land)} oproti {eur(landPerM2)}/m²)</span>}
              </div>
            </li>
            <li>
              <div className="text-muted">Stavebné náklady</div>
              <div className="text-[18px] font-semibold">
                {be.build === null ? '—' : `${be.build >= 0 ? '+' : ''}${pct(be.build)}`}
                {be.build !== null && <span className="ml-2 text-[13px] font-normal text-ink-2">oproti výkazu výmer {eurShort(r.costs.construction)}</span>}
              </div>
            </li>
          </ul>
          <p className="mt-3 text-[12.5px] text-muted">
            Kladná hodnota je rezerva, záporná znamená potrebné zlepšenie. Kombinácie pák nájdete v časti{' '}
            <a href="#ekonomika">Ekonomika → Scenáre a citlivosť</a>.
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Štruktúra nákladov" hint={`Spolu ${eur(r.kpi.totalCost)} vrátane financovania`}>
          <BarList
            format={eurShort}
            rows={[
              ...r.costs.groups.filter((g) => g.plan > 0).map((g) => ({ label: g.name, value: g.plan })),
              ...(r.finance.cost > 0 ? [{ label: 'Financovanie', value: r.finance.cost }] : []),
            ].sort((a, b) => b.value - a.value)}
          />
        </Card>

        <Card title="Stav predaja" hint={`${data.units.length} jednotiek · cenníková hodnota ${eurShort(r.revenue.gross)}`}>
          <SegBar
            ariaLabel="Jednotky podľa stavu"
            format={(v) => `${v} ks`}
            parts={UNIT_STATUS_ORDER.map((st) => ({
              label: UNIT_STATUS[st].label,
              value: r.revenue.byStatus[st].count,
              color: UNIT_STATUS[st].color,
              darkText: st === 'free' || st === 'reserved',
            }))}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <div className="text-muted">Priemerná cena</div>
              <div className="font-semibold">{eur(r.revenue.avgPerM2)}/m²</div>
            </div>
            <div>
              <div className="text-muted">Voľné jednotky</div>
              <div className="font-semibold">{eurShort(r.revenue.freeGross)}</div>
            </div>
          </div>
        </Card>

        <Card title="Míľniky" hint="Podľa harmonogramu">
          <ul className="m-0 grid list-none gap-2 p-0 text-[13.5px]">
            {[
              ['Začiatok výstavby', monthLabel(s.startMonth, r.ms.constructionStart)],
              ['Hrubá stavba hotová', monthLabel(s.startMonth, r.ms.shell)],
              ['Kolaudácia', completion ? monthLabel(s.startMonth, completion.start + completion.duration - 1) : '—'],
              ['Odovzdávanie bytov', monthLabel(s.startMonth, r.ms.handover)],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                <span className="text-ink-2">{k}</span>
                <span className="font-semibold">{v}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            {deadline ? (
              <Note tone={deadlineDays !== null && deadlineDays < 180 ? 'warn' : 'neutral'}>
                Stavbu treba začať do <strong>{fmtDate(deadline)}</strong>
                {deadlineDays !== null && (deadlineDays >= 0 ? ` (zostáva ${deadlineDays} dní)` : ` (lehota uplynula pred ${-deadlineDays} dňami)`)}.
              </Note>
            ) : (
              <Note tone="warn">
                Doplňte dátum právoplatnosti stavebného povolenia v <a href="#projekt">Karte projektu</a> – aplikácia potom stráži lehotu na začatie stavby.
              </Note>
            )}
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <a href="#povolenia" className="text-ink-2">Povolenia a kroky</a>
              <span className="font-semibold">{permitsDone} / {permitsAll}</span>
            </div>
            <Meter value={permitsDone} max={permitsAll} label="Splnené kroky povoľovacieho procesu" />
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Najbližšie úlohy" action={<a href="#ulohy" className="text-[13px]">Všetky úlohy</a>}>
          {tasks.length === 0 ? (
            <p className="m-0 text-[13px] text-muted">Žiadne otvorené úlohy.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0 text-[13.5px]">
              {tasks.map((t) => {
                const d = daysUntil(t.due)
                return (
                  <li key={t.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      {t.title}
                      <span className="block text-[12px] text-muted">{t.area}</span>
                    </span>
                    {d !== null && <Badge tone={d < 0 ? 'crit' : d <= 14 ? 'warn' : 'neutral'}>{d < 0 ? `po termíne ${-d} d` : fmtDate(t.due)}</Badge>}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Najväčšie riziká" action={<a href="#rizika" className="text-[13px]">Register rizík</a>}>
          <ul className="m-0 grid list-none gap-2.5 p-0 text-[13.5px]">
            {risks.map((x) => (
              <li key={x.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">{x.title}</span>
                <Badge tone={riskTone(x.probability * x.impact)} title="Pravdepodobnosť × dopad">
                  <TriangleAlert size={12} aria-hidden /> {x.probability * x.impact}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Obchod" action={<a href="#klienti" className="text-[13px]">Klienti a obchod</a>}>
          {activeClients.length === 0 ? (
            <p className="m-0 text-[13px] text-muted">
              Zatiaľ žiadni záujemcovia. Pridajte prvého klienta v časti Klienti a obchod – uvidíte tu rozloženie podľa fázy obchodu.
            </p>
          ) : (
            <BarList
              format={(v) => `${v}`}
              rows={PIPELINE.filter((p) => p.id !== 'lost')
                .map((p) => ({ label: p.label, value: activeClients.filter((c) => c.stage === p.id).length }))
                .filter((x) => x.value > 0)}
            />
          )}
        </Card>
      </div>
    </>
  )
}
