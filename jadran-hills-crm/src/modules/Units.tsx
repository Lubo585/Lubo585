import { Download, Plus, Printer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { isSold, listPrice, sellableArea } from '../lib/calc'
import { eur, eurShort, num, todayIso, uid } from '../lib/format'
import { hosted } from '../lib/platform'
import { exportCsv } from '../lib/export'
import { useStore } from '../store'
import type { Unit, UnitStatus } from '../types'
import { Badge, Button, Card, Check, Field, IconButton, Note, NumInput, PageHead, Select, Stat, TextInput } from '../ui/kit'
import { floorLabel, UNIT_STATUS, UNIT_STATUS_ORDER } from '../ui/labels'

const AREA_LABEL = { interior: 'Interiér', coveredTerrace: 'Krytá terasa', loggia: 'Lodžia', roofTerrace: 'Strešná terasa', garden: 'Záhrada' } as const

export default function Units() {
  const { data, r, patch, add, remove, setSettings } = useStore()
  const s = data.settings
  const [building, setBuilding] = useState('all')
  const [status, setStatus] = useState<'all' | UnitStatus>('all')

  const rows = r.units.filter((u) => (building === 'all' || u.unit.buildingId === building) && (status === 'all' || u.unit.status === status))
  const maxFloor = Math.max(0, ...data.units.map((u) => u.floor))
  const missingGardens = data.units.some((u) => u.floor === 0) && data.units.filter((u) => u.floor === 0).every((u) => u.garden === 0)

  const setStatusOf = (u: Unit, st: UnitStatus) => {
    if (st === 'free') patch('units', u.id, { status: st, soldPrice: null, saleDate: null, clientId: null })
    else patch('units', u.id, { status: st, soldPrice: u.soldPrice ?? listPrice(u, s), saleDate: u.saleDate ?? todayIso() })
  }

  const csv = () =>
    exportCsv('cennik-jednotiek.csv', [
      ['Byt', 'Dom', 'Podlažie', 'Dispozícia', 'Orientácia', 'Interiér m²', 'Krytá terasa m²', 'Lodžia m²', 'Strešná terasa m²', 'Záhrada m²', 'Predajná plocha m²', 'Parkovanie', 'Cenníková cena €', 'Cena €/m²', 'Stav', 'Zmluvná cena €', 'Dátum', 'Poznámka'],
      ...r.units.map((u) => [
        u.unit.label, u.building?.name ?? '', floorLabel(u.unit.floor), u.unit.layout, u.unit.orientation, u.unit.interior, u.unit.coveredTerrace, u.unit.loggia,
        u.unit.roofTerrace, u.unit.garden, u.area, u.unit.parking, u.list, u.area > 0 ? u.list / u.area : 0, UNIT_STATUS[u.unit.status].label,
        u.unit.soldPrice ?? '', u.unit.saleDate ?? '', u.unit.note,
      ]),
    ])

  const addUnit = () => {
    const b = data.buildings.find((x) => x.id === building) ?? data.buildings[0]
    if (!b) return
    add('units', {
      id: uid('u'), buildingId: b.id, label: `${b.code}${data.units.filter((u) => u.buildingId === b.id).length + 1}`, floor: 0, layout: '', bedrooms: 1,
      interior: 0, coveredTerrace: 0, loggia: 0, roofTerrace: 0, garden: 0, parking: 1, orientation: '', status: 'free', priceMode: 'auto', manualPrice: 0,
      soldPrice: null, saleDate: null, clientId: null, note: '',
    })
  }

  return (
    <>
      <PageHead
        title="Jednotky a cenník"
        sub="Byty s plochami, automatický cenník podľa predajnej plochy a stav predaja. Cena sa prepočítava z nastavení nižšie; pri jednotlivom byte ju možno zadať ručne."
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={csv}>Export CSV</Button>
            {!hosted && <Button icon={<Printer size={15} />} onClick={() => window.print()}>Tlač cenníka</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Jednotky" value={data.units.length} sub={`${r.revenue.soldCount} predaných alebo rezervovaných`} />
        <Stat label="Vnútorná plocha" value={`${num(r.revenue.interior, 0)} m²`} />
        <Stat label="Predajná plocha" value={`${num(r.revenue.area, 0)} m²`} sub="vrátane vážených terás" />
        <Stat label={s.pricesIncludeVat ? 'Hodnota cenníka s DPH' : 'Hodnota cenníka'} value={eurShort(r.units.reduce((a, u) => a + u.list, 0))} />
        <Stat label="Priemerná cena" value={`${eur(r.revenue.avgPerM2)}/m²`} sub="na m² predajnej plochy" />
      </div>

      <div className="no-print mt-4">
        <Card title="Nastavenie cenníka" hint="Cena = predajná plocha × základná cena × (1 + príplatok podlažia) × (1 + príplatok domu) + parkovanie">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Základná cena">
              <NumInput value={s.pricing.basePerM2} onChange={(v) => setSettings((x) => ({ ...x, pricing: { ...x.pricing, basePerM2: v } }))} suffix="€/m²" />
            </Field>
            {Array.from({ length: maxFloor + 1 }, (_, f) => (
              <Field key={f} label={`Príplatok – ${floorLabel(f).toLowerCase()}`}>
                <NumInput
                  decimals={1}
                  value={s.pricing.floorAdjPct[f] ?? 0}
                  onChange={(v) =>
                    setSettings((x) => {
                      const arr = Array.from({ length: maxFloor + 1 }, (_, i) => x.pricing.floorAdjPct[i] ?? 0)
                      arr[f] = v
                      return { ...x, pricing: { ...x.pricing, floorAdjPct: arr } }
                    })
                  }
                  suffix="%"
                />
              </Field>
            ))}
            {data.buildings.map((b) => (
              <Field key={b.id} label={`Príplatok – ${b.name}`}>
                <NumInput
                  decimals={1}
                  value={s.pricing.buildingAdjPct[b.id] ?? 0}
                  onChange={(v) => setSettings((x) => ({ ...x, pricing: { ...x.pricing, buildingAdjPct: { ...x.pricing.buildingAdjPct, [b.id]: v } } }))}
                  suffix="%"
                />
              </Field>
            ))}
            <Field label="Parkovacie miesto" hint="0 = v cene bytu">
              <NumInput value={s.pricing.parkingPrice} onChange={(v) => setSettings((x) => ({ ...x, pricing: { ...x.pricing, parkingPrice: v } }))} suffix="€" />
            </Field>
            <Field label="Zaokrúhlenie ceny">
              <NumInput value={s.pricing.roundTo} onChange={(v) => setSettings((x) => ({ ...x, pricing: { ...x.pricing, roundTo: v } }))} suffix="€" />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['coveredTerrace', 'Koeficient – krytá terasa'],
                ['loggia', 'Koeficient – lodžia'],
                ['roofTerrace', 'Koeficient – strešná terasa'],
                ['garden', 'Koeficient – záhrada'],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <NumInput decimals={2} min={0} max={1} value={s.areaCoef[k]} onChange={(v) => setSettings((x) => ({ ...x, areaCoef: { ...x.areaCoef, [k]: v } }))} />
              </Field>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Check checked={s.pricesIncludeVat} onChange={(v) => setSettings((x) => ({ ...x, pricesIncludeVat: v }))} label={`Ceny v cenníku sú vrátane DPH ${num(s.vatPct, 0)} %`} />
          </div>
        </Card>
      </div>

      {missingGardens && (
        <div className="no-print mt-4">
          <Note tone="warn" title="Doplňte záhrady a overte plochy">
            Plochy sú prevzaté z výkresov inštalácií. Výmery záhrad prízemných bytov a počet parkovacích miest v dostupných
            podkladoch nie sú – doplňte ich podľa architektonického projektu, cenník sa prepočíta.
          </Note>
        </div>
      )}

      <div className="mt-4">
        <Card
          title="Zoznam jednotiek"
          action={
            <>
              <Select auto value={building} onChange={setBuilding} ariaLabel="Filter podľa domu" options={[{ value: 'all', label: 'Všetky domy' }, ...data.buildings.map((b) => ({ value: b.id, label: b.name }))]} />
              <Select
                auto
                value={status}
                onChange={(v) => setStatus(v as 'all' | UnitStatus)}
                ariaLabel="Filter podľa stavu"
                options={[{ value: 'all', label: 'Všetky stavy' }, ...UNIT_STATUS_ORDER.map((st) => ({ value: st, label: UNIT_STATUS[st].label }))]}
              />
              <Button size="sm" icon={<Plus size={15} />} onClick={addUnit}>Pridať</Button>
            </>
          }
          pad={false}
        >
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1]">Byt</th>
                  <th>Dispozícia</th>
                  <th>Podlažie</th>
                  <th className="num">Predajná plocha</th>
                  <th className="num">Cenníková cena</th>
                  <th className="num">€/m²</th>
                  <th>Stav</th>
                  <th className="num">Zmluvná cena</th>
                  <th>Dátum</th>
                  <th>Klient</th>
                  <th className="num">Interiér</th>
                  <th className="num">Krytá terasa</th>
                  <th className="num">Lodžia</th>
                  <th className="num">Strešná terasa</th>
                  <th className="num">Záhrada</th>
                  <th>Cena</th>
                  <th>Poznámka</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ unit: u, area, list }) => (
                  <tr key={u.id}>
                    <td className="sticky left-0 z-[1] bg-surface" style={{ minWidth: 64 }}><TextInput cell value={u.label} onChange={(v) => patch('units', u.id, { label: v })} ariaLabel="Označenie bytu" /></td>
                    <td style={{ minWidth: 290 }} title={u.layout}><TextInput cell value={u.layout} onChange={(v) => patch('units', u.id, { layout: v })} ariaLabel="Dispozícia" /></td>
                    <td style={{ minWidth: 126 }}>
                      <Select
                        cell
                        value={String(u.floor)}
                        onChange={(v) => patch('units', u.id, { floor: Number(v) })}
                        ariaLabel="Podlažie"
                        options={Array.from({ length: Math.max(maxFloor, 3) + 1 }, (_, f) => ({ value: String(f), label: floorLabel(f) }))}
                      />
                    </td>
                    <td className="num font-medium">{num(area)}</td>
                    <td className="num" style={{ minWidth: 104 }}>
                      {u.priceMode === 'manual' ? <NumInput cell value={u.manualPrice} onChange={(v) => patch('units', u.id, { manualPrice: v })} ariaLabel="Cenníková cena" /> : <span className="font-medium">{eur(list)}</span>}
                    </td>
                    <td className="num text-ink-2">{area > 0 ? num(list / area, 0) : '—'}</td>
                    <td style={{ minWidth: 128 }}>
                      <span className="hidden print:inline"><Badge tone={UNIT_STATUS[u.status].tone}>{UNIT_STATUS[u.status].label}</Badge></span>
                      <span className="print:hidden">
                        <Select cell value={u.status} onChange={(v) => setStatusOf(u, v)} ariaLabel="Stav" options={UNIT_STATUS_ORDER.map((st) => ({ value: st, label: UNIT_STATUS[st].label }))} />
                      </span>
                    </td>
                    <td className="num" style={{ minWidth: 104 }}>
                      {isSold(u) ? <NumInput cell value={u.soldPrice ?? 0} onChange={(v) => patch('units', u.id, { soldPrice: v })} ariaLabel="Zmluvná cena" /> : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ minWidth: 132 }}>
                      {isSold(u) ? <TextInput cell type="date" value={u.saleDate ?? ''} onChange={(v) => patch('units', u.id, { saleDate: v || null })} ariaLabel="Dátum rezervácie alebo zmluvy" /> : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <Select
                        cell
                        value={u.clientId ?? ''}
                        onChange={(v) => patch('units', u.id, { clientId: v || null })}
                        ariaLabel="Klient"
                        options={[{ value: '', label: '—' }, ...data.clients.map((c) => ({ value: c.id, label: c.name }))]}
                      />
                    </td>
                    {(['interior', 'coveredTerrace', 'loggia', 'roofTerrace', 'garden'] as const).map((k) => (
                      <td key={k} className="num" style={{ minWidth: 78 }}>
                        <NumInput cell decimals={2} value={u[k]} onChange={(v) => patch('units', u.id, { [k]: v })} ariaLabel={AREA_LABEL[k]} />
                      </td>
                    ))}
                    <td style={{ minWidth: 96 }}>
                      <Select
                        cell
                        value={u.priceMode}
                        onChange={(v) => patch('units', u.id, { priceMode: v, manualPrice: v === 'manual' && !u.manualPrice ? list : u.manualPrice })}
                        ariaLabel="Spôsob určenia ceny"
                        options={[{ value: 'auto', label: 'Výpočet' }, { value: 'manual', label: 'Ručne' }]}
                      />
                    </td>
                    <td style={{ minWidth: 260 }} title={u.note}><TextInput cell value={u.note} onChange={(v) => patch('units', u.id, { note: v })} ariaLabel="Poznámka" /></td>
                    <td><IconButton title="Odstrániť jednotku" tone="crit" onClick={() => remove('units', u.id)}><Trash2 size={15} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky left-0 z-[1]" colSpan={3}>Spolu ({rows.length})</td>
                  <td className="num">{num(rows.reduce((a, x) => a + sellableArea(x.unit, s), 0))}</td>
                  <td className="num">{eur(rows.reduce((a, x) => a + x.list, 0))}</td>
                  <td colSpan={2} />
                  <td className="num">{eur(rows.reduce((a, x) => a + (isSold(x.unit) ? (x.unit.soldPrice ?? 0) : 0), 0))}</td>
                  <td colSpan={2} />
                  <td className="num">{num(rows.reduce((a, x) => a + x.unit.interior, 0))}</td>
                  <td className="num">{num(rows.reduce((a, x) => a + x.unit.coveredTerrace, 0))}</td>
                  <td className="num">{num(rows.reduce((a, x) => a + x.unit.loggia, 0))}</td>
                  <td className="num">{num(rows.reduce((a, x) => a + x.unit.roofTerrace, 0))}</td>
                  <td className="num">{num(rows.reduce((a, x) => a + x.unit.garden, 0))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
