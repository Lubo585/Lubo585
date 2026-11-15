import { Plus, Trash2 } from 'lucide-react'
import { addYears, eur, fmtDate, num, uid } from '../lib/format'
import { useStore } from '../store'
import type { ParcelUse, ProjectInfo } from '../types'
import { Button, Card, Field, IconButton, Note, NumInput, PageHead, Select, TextArea, TextInput } from '../ui/kit'
import { PARCEL_USE } from '../ui/labels'

export default function ProjectCard() {
  const { data, r, set, patch, add, remove } = useStore()
  const p = data.project
  const upd = (x: Partial<ProjectInfo>) => set((d) => ({ ...d, project: { ...d.project, ...x } }))

  const landArea = data.parcels.reduce((a, x) => a + x.area, 0)
  const landTotal = data.parcels.reduce((a, x) => a + x.area * x.pricePerM2, 0)
  const techGroups = [...new Set(data.tech.map((t) => t.group))]
  const deadline = p.permitFinalDate ? addYears(p.permitFinalDate, p.permitValidYears) : null

  return (
    <>
      <PageHead title="Karta projektu" sub="Základné údaje, pozemky, domy a technické parametre prevzaté z projektovej dokumentácie." />

      <div className="grid gap-4">
        <Card title="Základné údaje">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Názov projektu"><TextInput value={p.name} onChange={(v) => upd({ name: v })} /></Field>
            <Field label="Podtitul"><TextInput value={p.subtitle} onChange={(v) => upd({ subtitle: v })} /></Field>
            <Field label="Štádium"><TextInput value={p.stage} onChange={(v) => upd({ stage: v })} /></Field>
            <Field label="Investor / stavebník"><TextInput value={p.investor} onChange={(v) => upd({ investor: v })} /></Field>
            <Field label="Identifikačné číslo"><TextInput value={p.investorId} onChange={(v) => upd({ investorId: v })} /></Field>
            <Field label="Sídlo"><TextInput value={p.investorAddress} onChange={(v) => upd({ investorAddress: v })} /></Field>
            <Field label="Lokalita"><TextInput value={p.location} onChange={(v) => upd({ location: v })} /></Field>
            <Field label="Katastrálne územie"><TextInput value={p.cadastral} onChange={(v) => upd({ cadastral: v })} /></Field>
            <Field label="Začiatok modelu (mesiac 0)" hint="Od tohto mesiaca sa počíta harmonogram a cash-flow.">
              <TextInput type="month" value={data.settings.startMonth} onChange={(v) => v && set((d) => ({ ...d, settings: { ...d.settings, startMonth: v } }))} />
            </Field>
            <Field label="Právoplatnosť stavebného povolenia">
              <TextInput type="date" value={p.permitFinalDate ?? ''} onChange={(v) => upd({ permitFinalDate: v || null })} />
            </Field>
            <Field label="Lehota na začatie stavby" hint="Roky od právoplatnosti povolenia.">
              <NumInput value={p.permitValidYears} onChange={(v) => upd({ permitValidYears: v })} min={1} max={10} suffix="roky" />
            </Field>
            <div className="flex items-end">
              {deadline ? (
                <Note>Stavbu treba začať do <strong>{fmtDate(deadline)}</strong>.</Note>
              ) : (
                <Note tone="warn">Bez dátumu právoplatnosti sa lehota nesleduje.</Note>
              )}
            </div>
            <Field label="Poznámky" className="sm:col-span-2 lg:col-span-3">
              <TextArea value={p.notes} onChange={(v) => upd({ notes: v })} rows={4} />
            </Field>
          </div>
          <div className="mt-3">
            <Note>
              Lehotu na začatie stavby určuje zákon platný pre vaše povolenie – doterajšia úprava počítala s 3 rokmi, nový
              chorvátsky zákon o výstavbe účinný od roku 2026 ju upravuje inak. Ktorá lehota platí pre toto povolenie, si overte u advokáta.
            </Note>
          </div>
        </Card>

        <Card
          title="Pozemky"
          hint={`${num(landArea, 0)} m² · kúpna cena spolu ${eur(landTotal)}`}
          action={
            <Button size="sm" icon={<Plus size={15} />} onClick={() => add('parcels', { id: uid('par'), number: '', kind: '', area: 0, use: 'other', pricePerM2: 0, note: '' })}>
              Pridať parcelu
            </Button>
          }
          pad={false}
        >
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Druh</th>
                  <th>Využitie</th>
                  <th className="num">Výmera m²</th>
                  <th className="num">Cena €/m²</th>
                  <th className="num">Cena spolu</th>
                  <th>Poznámka</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.parcels.map((x) => (
                  <tr key={x.id}>
                    <td style={{ minWidth: 90 }}><TextInput cell value={x.number} onChange={(v) => patch('parcels', x.id, { number: v })} ariaLabel="Číslo parcely" /></td>
                    <td style={{ minWidth: 110 }}><TextInput cell value={x.kind} onChange={(v) => patch('parcels', x.id, { kind: v })} ariaLabel="Druh pozemku" /></td>
                    <td style={{ minWidth: 110 }}>
                      <Select cell value={x.use} onChange={(v: ParcelUse) => patch('parcels', x.id, { use: v })} options={Object.entries(PARCEL_USE).map(([value, label]) => ({ value: value as ParcelUse, label }))} ariaLabel="Využitie" />
                    </td>
                    <td className="num" style={{ minWidth: 90 }}><NumInput cell value={x.area} onChange={(v) => patch('parcels', x.id, { area: v })} ariaLabel="Výmera" /></td>
                    <td className="num" style={{ minWidth: 90 }}><NumInput cell value={x.pricePerM2} onChange={(v) => patch('parcels', x.id, { pricePerM2: v })} ariaLabel="Cena za m²" /></td>
                    <td className="num">{eur(x.area * x.pricePerM2)}</td>
                    <td style={{ minWidth: 260 }}><TextInput cell value={x.note} onChange={(v) => patch('parcels', x.id, { note: v })} ariaLabel="Poznámka" /></td>
                    <td><IconButton title="Odstrániť parcelu" tone="crit" onClick={() => remove('parcels', x.id)}><Trash2 size={15} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Spolu</td>
                  <td className="num">{num(landArea, 0)}</td>
                  <td className="num">{landArea > 0 ? num(landTotal / landArea, 0) : '—'}</td>
                  <td className="num">{eur(landTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="px-4 pb-4 pt-3 sm:px-5">
            <Note tone="accent">
              Kúpna cena pozemkov vstupuje do rozpočtu nákladov automaticky. Pozemok pripadá na {eur(r.kpi.landPerM2Area)} na m² predajnej plochy bytov.
            </Note>
          </div>
        </Card>

        <Card title="Domy a etapizácia" hint="Posun začiatku výstavby umožní stavať domy postupne a znížiť potrebu vlastných zdrojov." pad={false}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dom</th>
                  <th>Názov</th>
                  <th>Parcela</th>
                  <th>Označenie projektu</th>
                  <th className="num">Byty</th>
                  <th className="num">Hrubá podl. plocha m²</th>
                  <th className="num">Obostavaný objem m³</th>
                  <th className="num">Posun začiatku (mes.)</th>
                  <th>Poznámka</th>
                </tr>
              </thead>
              <tbody>
                {data.buildings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-semibold">{b.code}</td>
                    <td style={{ minWidth: 100 }}><TextInput cell value={b.name} onChange={(v) => patch('buildings', b.id, { name: v })} ariaLabel="Názov domu" /></td>
                    <td style={{ minWidth: 90 }}><TextInput cell value={b.parcelNumber} onChange={(v) => patch('buildings', b.id, { parcelNumber: v })} ariaLabel="Parcela" /></td>
                    <td style={{ minWidth: 110 }}><TextInput cell value={b.designRef} onChange={(v) => patch('buildings', b.id, { designRef: v })} ariaLabel="Označenie projektu" /></td>
                    <td className="num">{data.units.filter((u) => u.buildingId === b.id).length}</td>
                    <td className="num" style={{ minWidth: 100 }}><NumInput cell decimals={1} value={b.grossFloorArea} onChange={(v) => patch('buildings', b.id, { grossFloorArea: v })} ariaLabel="Hrubá podlažná plocha" /></td>
                    <td className="num" style={{ minWidth: 100 }}><NumInput cell value={b.grossVolume} onChange={(v) => patch('buildings', b.id, { grossVolume: v })} ariaLabel="Obostavaný objem" /></td>
                    <td className="num" style={{ minWidth: 90 }}><NumInput cell value={b.startOffset} min={0} max={60} onChange={(v) => patch('buildings', b.id, { startOffset: Math.round(v) })} ariaLabel="Posun začiatku výstavby" /></td>
                    <td style={{ minWidth: 240 }}><TextInput cell value={b.note} onChange={(v) => patch('buildings', b.id, { note: v })} ariaLabel="Poznámka" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {techGroups.length > 0 && (
          <Card title="Technické parametre a miestne podmienky" hint="Prevzaté z projektovej dokumentácie a verejných zdrojov; pri každom údaji je uvedený zdroj.">
            <div className="grid gap-5">
              {techGroups.map((g) => (
                <div key={g}>
                  <h3 className="mb-2 text-[13px] font-semibold text-ink-2">{g}</h3>
                  <div className="tbl-wrap rounded-lg border border-line">
                    <table className="tbl">
                      <tbody>
                        {data.tech.filter((t) => t.group === g).map((t) => (
                          <tr key={t.id}>
                            <td className="w-[26%] min-w-[150px] align-top text-muted">{t.label}</td>
                            <td className="min-w-[240px] align-top">{t.value}</td>
                            <td className="w-[22%] min-w-[140px] align-top text-[12.5px] text-muted">{t.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
