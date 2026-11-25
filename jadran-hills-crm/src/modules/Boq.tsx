import { ChevronDown, ChevronRight, Download, Plus, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { constructionBudget, RATES_SECTION } from '../lib/calc'
import { eur, eurShort, num, pct, uid } from '../lib/format'
import { hosted } from '../lib/platform'
import { exportCsv } from '../lib/export'
import { useStore } from '../store'
import type { BoqSource, ConstructionBudget, ID } from '../types'
import { BarList } from '../ui/charts'
import { cx } from '../ui/cx'
import { Badge, Button, Card, Check, Field, IconButton, Note, NumInput, PageHead, Select, Stat, TextInput } from '../ui/kit'

const SOURCE: Record<BoqSource, { label: string; long: string; tone: 'good' | 'accent' | 'warn' }> = {
  P: { label: 'Projekt', long: 'údaj priamo z projektovej dokumentácie', tone: 'good' },
  V: { label: 'Výpočet', long: 'vypočítané z údajov projektu', tone: 'accent' },
  O: { label: 'Odhad', long: 'odhad podľa bežných pomerov – pred tendrom overiť', tone: 'warn' },
}

export default function Boq() {
  const { data, r, set, patch, add, remove, setSettings } = useStore()
  const [open, setOpen] = useState<Set<ID>>(() => new Set(data.boqSections.slice(0, 1).map((s) => s.id)))
  const [onlyEstimates, setOnlyEstimates] = useState(false)
  const [adjust, setAdjust] = useState(0)
  const [adjustScope, setAdjustScope] = useState('all')
  const nB = Math.max(1, data.buildings.length)
  const gfa = r.kpi.gfa
  /** Domy sa počítajú buď z položiek výkazu, alebo cieľovými sadzbami na m². */
  const budget = constructionBudget(data.settings)
  const rates = r.boq.rates
  const setBudget = (change: Partial<ConstructionBudget>) => setSettings((x) => ({ ...x, construction: { ...constructionBudget(x), ...change } }))
  /** Čo by stavba stála podľa položiek výkazu – pri sadzbách sa líši od rozpočtu. */
  const itemizedTotal = r.boq.sections.reduce((a, st) => a + st.itemized * st.multiplier, 0)
  /** Oddiely, ktoré idú do rozpočtu súčtom položiek aj pri sadzbách (bazén, areál). */
  const itemizedSections = r.boq.sections.filter((st) => !st.byRates && st.total > 0)

  const toggle = (id: ID) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const bySource = (['P', 'V', 'O'] as BoqSource[]).map((src) => {
    const items = data.boq.filter((i) => i.source === src)
    const value = items.reduce((a, i) => {
      const sec = data.boqSections.find((s) => s.id === i.sectionId)
      return a + i.qty * i.unitPrice * (sec?.scope === 'building' ? nB : 1)
    }, 0)
    return { src, count: items.length, value }
  })

  const applyAdjust = () => {
    if (!adjust) return
    const k = 1 + adjust / 100
    set((d) => ({
      ...d,
      boq: d.boq.map((i) => (adjustScope === 'all' || i.sectionId === adjustScope ? { ...i, unitPrice: Math.round(i.unitPrice * k * 100) / 100 } : i)),
    }))
    setAdjust(0)
  }

  const csv = () =>
    exportCsv('vykaz-vymer.csv', [
      ['Kód', 'Oddiel / položka', 'MJ', 'Množstvo', 'Jedn. cena €', 'Spolu 1× €', 'Násobok', 'Spolu projekt €', 'Pôvod množstva', 'Poznámka'],
      ...r.boq.sections.flatMap((st) => [
        [st.section.code, st.section.name.toUpperCase(), '', '', '', st.perUnit, st.multiplier, st.total, '', `${st.section.scope === 'building' ? 'na 1 dom' : 'areál'}${st.byRates ? `; v rozpočte podľa sadzieb na m², položky spolu ${Math.round(st.itemized)} €` : ''}`],
        ...data.boq
          .filter((i) => i.sectionId === st.section.id)
          .map((i) => [i.code, i.name, i.unit, i.qty, i.unitPrice, i.qty * i.unitPrice, st.multiplier, i.qty * i.unitPrice * st.multiplier, SOURCE[i.source].label, i.note]),
      ]),
      ['', 'SPOLU', '', '', '', '', '', r.boq.total, '', ''],
    ])

  const addSection = () => {
    const id = uid('sec')
    const used = data.boqSections.map((s) => Number(s.code)).filter((n) => Number.isFinite(n))
    const code = String(Math.max(0, ...used) + 1).padStart(2, '0')
    add('boqSections', { id, code, name: 'Nový oddiel', scope: 'building', phaseId: null })
    setOpen((o) => new Set(o).add(id))
  }

  const removeSection = (id: ID) =>
    set((d) => {
      const c = d.settings.construction
      // Zrušený oddiel nemá ostať v zozname oddielov počítaných z položiek.
      const settings = c?.detailedSections.includes(id) ? { ...d.settings, construction: { ...c, detailedSections: c.detailedSections.filter((x) => x !== id) } } : d.settings
      return { ...d, settings, boqSections: d.boqSections.filter((s) => s.id !== id), boq: d.boq.filter((i) => i.sectionId !== id) }
    })

  return (
    <>
      <PageHead
        title="Výkaz výmer"
        sub="Položkový rozpočet stavby podľa oddielov. Množstvá pri domoch platia pre jeden dom a násobia sa počtom domov; areálové oddiely sa počítajú raz. Súčet vstupuje do rozpočtu nákladov a cash-flow."
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={csv}>Export CSV</Button>
            {!hosted && (
              <Button icon={<Printer size={15} />} onClick={() => { setOpen(new Set(data.boqSections.map((s) => s.id))); window.setTimeout(() => window.print(), 150) }}>Tlač</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Jeden dom" value={eurShort(r.boq.perBuilding)} sub={gfa > 0 ? `${eur(r.boq.perBuilding / (gfa / nB))}/m² hrubej plochy` : undefined} />
        <Stat label={`Domy spolu (× ${nB})`} value={eurShort(r.boq.buildings)} />
        <Stat label="Areál" value={eurShort(r.boq.site)} />
        <Stat label={rates ? 'Stavba spolu' : 'Výkaz výmer spolu'} value={eurShort(r.boq.total)} sub={rates ? 'domy sadzbami na m², bez DPH a rezervy' : 'bez DPH a bez rezervy'} />
        <Stat label="Stavba vrátane rezervy" value={gfa > 0 ? `${eur(r.kpi.constructionPerM2Gfa)}/m²` : '—'} sub="na m² hrubej podlažnej plochy" />
      </div>

      <div className="mt-4" data-construction-budget>
        <Card title="Rozpočet stavby" hint="Kým nie sú ponuky zhotoviteľov, možno domy počítať cieľovou cenou za m². Výkaz výmer ostáva zachovaný – určuje, ako sa suma rozloží medzi oddiely a v čase.">
          <div className="no-print grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Stavba domov sa počíta">
              <Select
                value={budget.mode}
                onChange={(v) => setBudget({ mode: v === 'rates' ? 'rates' : 'boq' })}
                options={[{ value: 'boq', label: 'Z položiek výkazu výmer' }, { value: 'rates', label: 'Sadzbami na m²' }]}
              />
            </Field>
            {rates && (
              <>
                <Field label="Interiér bytov">
                  <NumInput value={budget.interiorPerM2} onChange={(v) => setBudget({ interiorPerM2: v })} suffix="€/m²" />
                </Field>
                <Field label="Terasy a lodžie">
                  <NumInput value={budget.terracePerM2} onChange={(v) => setBudget({ terracePerM2: v })} suffix="€/m²" />
                </Field>
                <Field label="Schodisko a spoločné priestory">
                  <NumInput value={budget.commonPerM2} onChange={(v) => setBudget({ commonPerM2: v })} suffix="€/m²" />
                </Field>
                <Field label="Spoločné priestory v dome" hint="Plocha v jednom dome">
                  <NumInput decimals={2} value={budget.commonAreaPerBuilding} onChange={(v) => setBudget({ commonAreaPerBuilding: v })} suffix="m²" />
                </Field>
              </>
            )}
          </div>
          {rates && (
            <>
              <div className="tbl-wrap mt-4 rounded-lg border border-line">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Časť stavby</th>
                      <th className="num">Rozsah</th>
                      <th className="num">Jednotková cena</th>
                      <th className="num">Spolu</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Interiér bytov</td>
                      <td className="num">{num(rates.interiorArea, 2)} m²</td>
                      <td className="num">{eur(budget.interiorPerM2)}/m²</td>
                      <td className="num font-medium">{eur(rates.interior)}</td>
                    </tr>
                    <tr>
                      <td>Kryté terasy, lodžie a strešné terasy</td>
                      <td className="num">{num(rates.terraceArea, 2)} m²</td>
                      <td className="num">{eur(budget.terracePerM2)}/m²</td>
                      <td className="num font-medium">{eur(rates.terrace)}</td>
                    </tr>
                    <tr>
                      <td>Schodiská a spoločné priestory</td>
                      <td className="num">{num(rates.commonArea, 2)} m²</td>
                      <td className="num">{eur(budget.commonPerM2)}/m²</td>
                      <td className="num font-medium">{eur(rates.common)}</td>
                    </tr>
                    <tr className="total">
                      <td colSpan={3}>Domy podľa sadzieb spolu</td>
                      <td className="num">{eur(rates.total)}</td>
                    </tr>
                    {itemizedSections.map((st) => (
                      <tr key={st.section.id}>
                        <td>
                          {st.section.code} {st.section.name} <span className="text-muted">– z položiek</span>
                        </td>
                        <td className="num">{st.section.scope === 'building' ? `× ${nB} domy` : 'areál'}</td>
                        <td className="num">{st.section.scope === 'building' ? `${eur(st.perUnit)}/dom` : ''}</td>
                        <td className="num font-medium">{eur(st.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Stavba spolu</td>
                      <td className="num">{eur(r.boq.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {rates.total <= 0 && (
                <p className="mt-3 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn-ink">
                  Sadzby zatiaľ nie sú zadané – domy sú v rozpočte s nulovou sumou. Doplňte sadzby na m² a plochu spoločných priestorov.
                </p>
              )}
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                {rates.itemized > 0
                  ? `Podľa položiek výkazu výmer by práce nahradené sadzbami stáli ${eur(rates.itemized)} – sadzby sú ${pct((rates.total / rates.itemized) * 100, 0)} tejto sumy. `
                  : ''}
                Oddiely „z položiek“ a celý areál sa počítajú podrobne z výkazu nižšie; pri každom oddiele domu možno zvoliť, či ho sadzby zahŕňajú. Sumy sú bez DPH a bez stavebnej rezervy.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Spoľahlivosť množstiev" hint="Každá položka má označený pôvod množstva">
          <ul className="m-0 grid list-none gap-2.5 p-0 text-[13.5px]">
            {bySource.map((x) => (
              <li key={x.src} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-center gap-2">
                  <Badge tone={SOURCE[x.src].tone}>{SOURCE[x.src].label}</Badge>
                  <span className="text-ink-2">{SOURCE[x.src].long}</span>
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold">{x.count}</span> položiek · {eurShort(x.value)} ({pct(itemizedTotal > 0 ? (x.value / itemizedTotal) * 100 : 0, 0)})
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Note tone="warn" title="Orientačný výkaz – nie podklad na zmluvu">
              Jednotkové ceny sú orientačné (dodávka a montáž bez DPH) a množstvá označené ako odhad vychádzajú z bežných
              pomerov. Pred tendrom ich nahraďte podrobným výkazom z realizačného projektu a ponukami zhotoviteľov.
            </Note>
          </div>
        </Card>

        <Card title="Najväčšie oddiely" hint="Podiel na stavebných nákladoch projektu">
          <BarList
            format={eurShort}
            rows={[...r.boq.sections]
              .sort((a, b) => b.total - a.total)
              .slice(0, 8)
              .map((s) => ({ label: `${s.section.code} ${s.section.name}`, value: s.total, sub: pct(r.boq.total > 0 ? (s.total / r.boq.total) * 100 : 0, 0) }))}
          />
        </Card>
      </div>

      <div className="no-print mt-4">
        <Card title="Hromadná úprava jednotkových cien" hint="Napríklad po prvých ponukách zhotoviteľov alebo pri zmene cenovej hladiny">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Zmena cien" className="w-36"><NumInput decimals={1} value={adjust} onChange={setAdjust} suffix="%" /></Field>
            <Field label="Rozsah" className="w-72 max-w-full">
              <Select value={adjustScope} onChange={setAdjustScope} options={[{ value: 'all', label: 'Všetky oddiely' }, ...data.boqSections.map((s) => ({ value: s.id, label: `${s.code} ${s.name}` }))]} />
            </Field>
            <Button variant="primary" onClick={applyAdjust} disabled={!adjust}>Použiť</Button>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Check checked={onlyEstimates} onChange={setOnlyEstimates} label="Zobraziť len odhady" />
              <Button size="sm" onClick={() => setOpen(new Set(data.boqSections.map((s) => s.id)))}>Rozbaliť všetko</Button>
              <Button size="sm" onClick={() => setOpen(new Set())}>Zbaliť všetko</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-3">
        {r.boq.sections.map((st) => {
          const sec = st.section
          if (sec.id === RATES_SECTION) {
            return (
              <section key={sec.id} className="card rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
                <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate text-[14.5px] font-semibold">{sec.name}</span>
                    <Badge tone="accent">× {nB} domy</Badge>
                  </span>
                  <div className="flex items-baseline gap-4 text-[13.5px] tabular-nums">
                    <span className="text-ink-2">{eur(st.perUnit)} / dom</span>
                    <span className="text-[15px] font-semibold">{eur(st.total)}</span>
                  </div>
                </header>
              </section>
            )
          }
          const isOpen = open.has(sec.id)
          const detailed = budget.detailedSections.includes(sec.id)
          const items = data.boq.filter((i) => i.sectionId === sec.id && (!onlyEstimates || i.source === 'O'))
          if (onlyEstimates && items.length === 0) return null
          return (
            <section key={sec.id} className="card rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
              <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                <button type="button" onClick={() => toggle(sec.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
                  {isOpen ? <ChevronDown size={17} className="shrink-0 text-muted" aria-hidden /> : <ChevronRight size={17} className="shrink-0 text-muted" aria-hidden />}
                  <span className="shrink-0 font-semibold tabular-nums text-muted">{sec.code}</span>
                  <span className="min-w-0 truncate text-[14.5px] font-semibold">{sec.name}</span>
                  <Badge tone={sec.scope === 'building' ? 'accent' : 'neutral'}>{sec.scope === 'building' ? `× ${nB} domy` : 'areál'}</Badge>
                  {st.byRates && <Badge tone="warn">podľa sadzieb</Badge>}
                  {rates && sec.scope === 'building' && !st.byRates && <Badge tone="good">z položiek</Badge>}
                </button>
                <div className="flex items-baseline gap-4 text-[13.5px] tabular-nums">
                  {st.byRates && <span className="text-muted">položky {eur(st.itemized)}</span>}
                  {sec.scope === 'building' && <span className="text-ink-2">{eur(st.perUnit)} / dom</span>}
                  <span className="text-[15px] font-semibold">{eur(st.total)}</span>
                </div>
              </header>

              {isOpen && (
                <>
                  <div className="no-print flex flex-wrap items-end gap-3 border-t border-line px-4 py-3 sm:px-5">
                    <Field label="Názov oddielu" className="w-64 max-w-full"><TextInput value={sec.name} onChange={(v) => patch('boqSections', sec.id, { name: v })} /></Field>
                    <Field label="Rozsah" className="w-44">
                      <Select value={sec.scope} onChange={(v) => patch('boqSections', sec.id, { scope: v })} options={[{ value: 'building', label: 'Na 1 dom' }, { value: 'site', label: 'Areál (1×)' }]} />
                    </Field>
                    <Field label="Fáza harmonogramu" className="w-72 max-w-full">
                      <Select
                        value={sec.phaseId ?? ''}
                        onChange={(v) => patch('boqSections', sec.id, { phaseId: v || null })}
                        options={[{ value: '', label: 'Celá výstavba (rovnomerne)' }, ...data.phases.filter((p) => p.group === 'build').map((p) => ({ value: p.id, label: p.name }))]}
                      />
                    </Field>
                    {rates && sec.scope === 'building' && (
                      <Check
                        checked={detailed}
                        onChange={(v) => setBudget({ detailedSections: v ? [...budget.detailedSections, sec.id] : budget.detailedSections.filter((x) => x !== sec.id) })}
                        label="Počítať z položiek aj pri sadzbách"
                      />
                    )}
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" icon={<Plus size={15} />} onClick={() => add('boq', { id: uid('boq'), sectionId: sec.id, code: `${sec.code}.${String(data.boq.filter((i) => i.sectionId === sec.id).length + 1).padStart(2, '0')}`, name: 'Nová položka', unit: 'm²', qty: 0, unitPrice: 0, source: 'O', note: '' })}>
                        Položka
                      </Button>
                      <Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={() => removeSection(sec.id)}>Oddiel</Button>
                    </div>
                  </div>
                  <div className="tbl-wrap border-t border-line">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Kód</th>
                          <th>Položka</th>
                          <th>MJ</th>
                          <th className="num">Množstvo</th>
                          <th className="num">Jedn. cena</th>
                          <th className="num">{sec.scope === 'building' ? 'Spolu 1 dom' : 'Spolu'}</th>
                          {sec.scope === 'building' && <th className="num">Spolu projekt</th>}
                          <th>Pôvod</th>
                          <th>Poznámka k množstvu</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.id}>
                            <td className="tabular-nums text-muted">{i.code}</td>
                            <td style={{ minWidth: 430 }} title={i.name}><TextInput cell value={i.name} onChange={(v) => patch('boq', i.id, { name: v })} ariaLabel="Názov položky" /></td>
                            <td style={{ minWidth: 58 }}><TextInput cell value={i.unit} onChange={(v) => patch('boq', i.id, { unit: v })} ariaLabel="Merná jednotka" /></td>
                            <td className="num" style={{ minWidth: 92 }}><NumInput cell decimals={2} value={i.qty} onChange={(v) => patch('boq', i.id, { qty: v })} ariaLabel="Množstvo" /></td>
                            <td className="num" style={{ minWidth: 92 }}><NumInput cell decimals={2} value={i.unitPrice} onChange={(v) => patch('boq', i.id, { unitPrice: v })} ariaLabel="Jednotková cena" /></td>
                            <td className={cx('num', sec.scope === 'site' && 'font-medium')}>{eur(i.qty * i.unitPrice)}</td>
                            {sec.scope === 'building' && <td className="num font-medium">{eur(i.qty * i.unitPrice * nB)}</td>}
                            <td style={{ minWidth: 100 }}>
                              <span className="hidden print:inline">{SOURCE[i.source].label}</span>
                              <span className="print:hidden">
                                <Select cell value={i.source} onChange={(v) => patch('boq', i.id, { source: v })} ariaLabel="Pôvod množstva" options={(['P', 'V', 'O'] as BoqSource[]).map((x) => ({ value: x, label: SOURCE[x].label }))} />
                              </span>
                            </td>
                            <td style={{ minWidth: 340 }} title={i.note}><TextInput cell value={i.note} onChange={(v) => patch('boq', i.id, { note: v })} ariaLabel="Poznámka" /></td>
                            <td><IconButton title="Odstrániť položku" tone="crit" onClick={() => remove('boq', i.id)}><Trash2 size={15} /></IconButton></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5}>{st.byRates ? `Oddiel ${sec.code} podľa položiek` : `Oddiel ${sec.code} spolu`}</td>
                          <td className="num">{eur(st.itemized)}</td>
                          {sec.scope === 'building' && <td className="num">{eur(st.itemized * st.multiplier)}</td>}
                          <td colSpan={3} />
                        </tr>
                        {st.byRates && (
                          <tr>
                            <td colSpan={5}>V rozpočte podľa sadzieb na m²</td>
                            <td className="num">{eur(st.perUnit)}</td>
                            <td className="num">{eur(st.total)}</td>
                            <td colSpan={3} />
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>

      <div className="no-print mt-3">
        <Button icon={<Plus size={15} />} onClick={addSection}>Pridať oddiel</Button>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-[14.5px] font-semibold">{rates ? 'Stavba spolu' : 'Výkaz výmer spolu'}</span>
          <span className="text-[20px] font-semibold tabular-nums">{eur(r.boq.total)}</span>
        </div>
        <div className="mt-1 text-[13px] text-ink-2">
          {num(nB, 0)} × {eur(r.boq.perBuilding)} + areál {eur(r.boq.site)} · bez DPH a bez stavebnej rezervy (tá je v rozpočte nákladov)
          {rates && ` · domy sú počítané sadzbami na m²; podľa položiek výkazu by stavba spolu stála ${eur(itemizedTotal)}`}
        </div>
      </div>
    </>
  )
}
