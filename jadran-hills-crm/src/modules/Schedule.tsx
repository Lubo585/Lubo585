import { Plus, Trash2 } from 'lucide-react'
import { addMonths, monthLabel, todayIso, uid } from '../lib/format'
import { useStore } from '../store'
import type { PhaseGroup, PhaseTag } from '../types'
import { Legend } from '../ui/charts'
import { Button, Card, IconButton, Note, NumInput, PageHead, Select, Stat, TextInput } from '../ui/kit'
import { PHASE_GROUP } from '../ui/labels'

const COL = 30 // šírka jedného mesiaca v px
const NAME_W = 250
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const TAGS: { value: PhaseTag | ''; label: string }[] = [
  { value: '', label: '—' },
  { value: 'construction_start', label: 'Začiatok výstavby' },
  { value: 'shell', label: 'Hrubá stavba (splátka kupujúcich)' },
  { value: 'completion', label: 'Kolaudácia' },
  { value: 'handover', label: 'Odovzdanie (doplatok)' },
  { value: 'presale', label: 'Predaj' },
]

export default function Schedule() {
  const { data, r, patch, add, remove } = useStore()
  const sm = data.settings.startMonth
  const phases = [...data.phases].sort((a, b) => a.start - b.start || a.duration - b.duration)
  const total = Math.max(r.n, ...data.phases.map((p) => p.start + p.duration), 12)
  const cols = Array.from({ length: total }, (_, i) => addMonths(sm, i))
  const day = Number(todayIso().slice(8, 10))
  const nowX = (r.nowIdx + (day - 1) / 30) * COL

  // Letná sezóna: 15. 6. – 15. 9. každého roka v rozsahu harmonogramu
  const seasons = cols
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.m === 6)
    .map(({ i }) => ({ left: (i + 0.5) * COL, width: Math.min(3, total - i - 0.5) * COL }))

  const completion = r.phases.find((p) => p.tag === 'completion')
  const years: { y: number; span: number }[] = []
  for (const c of cols) {
    const last = years[years.length - 1]
    if (last && last.y === c.y) last.span += 1
    else years.push({ y: c.y, span: 1 })
  }

  return (
    <>
      <PageHead
        title="Harmonogram"
        sub="Fázy prípravy, výstavby, dokončenia a predaja. Fázy určujú, kedy vznikajú stavebné náklady a kedy kupujúci platia splátky."
        actions={
          <Button icon={<Plus size={15} />} onClick={() => add('phases', { id: uid('ph'), name: 'Nová fáza', group: 'build', start: r.ms.constructionStart, duration: 2, progress: 0, tag: null, note: '' })}>
            Pridať fázu
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Začiatok výstavby" value={monthLabel(sm, r.ms.constructionStart)} />
        <Stat label="Hrubá stavba hotová" value={monthLabel(sm, r.ms.shell)} />
        <Stat label="Kolaudácia" value={completion ? monthLabel(sm, completion.start + completion.duration - 1) : '—'} />
        <Stat label="Odovzdávanie bytov" value={monthLabel(sm, r.ms.handover)} sub={`výstavba ${r.ms.constructionEnd - r.ms.constructionStart} mesiacov`} />
      </div>

      <div className="mt-4">
        <Card title="Časový plán" pad={false}>
          <div className="px-4 pb-3 sm:px-5">
            <Legend
              items={[
                ...Object.values(PHASE_GROUP).map((g) => ({ label: g.label, color: g.color })),
                { label: 'Letná sezóna 15. 6. – 15. 9. (zákaz hrubých prác)', color: 'var(--warn-soft)' },
              ]}
            />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <div style={{ minWidth: NAME_W + total * COL }} className="relative text-[12.5px]">
              {/* hlavička */}
              <div className="flex border-b border-line bg-surface">
                <div className="sticky left-0 z-[2] shrink-0 border-r border-line bg-surface px-3 py-1.5 font-semibold text-muted" style={{ width: NAME_W }}>
                  Fáza
                </div>
                <div>
                  <div className="flex">
                    {years.map((y) => (
                      <div key={y.y} className="border-r border-line px-1.5 py-0.5 font-semibold text-ink-2" style={{ width: y.span * COL }}>
                        {y.span >= 2 ? y.y : ''}
                      </div>
                    ))}
                  </div>
                  <div className="flex text-muted">
                    {cols.map((c, i) => (
                      <div key={i} className="text-center tabular-nums" style={{ width: COL }}>{MONTHS[c.m - 1]}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* riadky */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0" style={{ left: NAME_W, right: 0 }}>
                  {seasons.map((s, i) => (
                    <div key={i} className="absolute inset-y-0" style={{ left: s.left, width: s.width, background: 'var(--warn-soft)', opacity: 0.7 }} />
                  ))}
                  {cols.map((c, i) => (c.m === 1 && i > 0 ? <div key={i} className="absolute inset-y-0 w-px" style={{ left: i * COL, background: 'var(--line-2)' }} /> : null))}
                  <div className="absolute inset-y-0 w-px" style={{ left: nowX, background: 'var(--ink)' }} title="Dnes" />
                </div>
                {phases.map((p) => {
                  const g = PHASE_GROUP[p.group]
                  return (
                    <div key={p.id} className="flex items-center border-b border-line last:border-0" style={{ height: 34 }}>
                      <div className="sticky left-0 z-[1] flex h-full shrink-0 items-center border-r border-line bg-surface px-3" style={{ width: NAME_W }} title={p.name}>
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="relative h-full" style={{ width: total * COL }}>
                        <div
                          className="absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-[4px]"
                          style={{ left: p.start * COL + 1, width: Math.max(4, p.duration * COL - 2), background: `color-mix(in srgb, ${g.color} 38%, var(--surface))` }}
                          title={`${p.name}: ${monthLabel(sm, p.start)} – ${monthLabel(sm, p.start + p.duration - 1)}, hotovo ${p.progress} %`}
                        >
                          <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, p.progress))}%`, background: g.color }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="m-0 px-4 py-3 text-[12.5px] text-muted sm:px-5">
            Zvislá čiara označuje dnešok. Plná časť pruhu ukazuje rozpracovanosť fázy.
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Note tone="warn" title="Sezónny zákaz stavebných prác">
          Pobrežné obce v Chorvátsku každoročne zakazujú zemné, konštrukčné a hlučné práce počas turistickej sezóny. Hrubú
          stavbu, výkopy bazénov a areálové práce plánujte mimo vyznačeného obdobia; vnútorné práce možno robiť aj v lete.
          Presné dátumy pre vašu obec nájdete v Karte projektu a v kontrolnom zozname povolení.
        </Note>
      </div>

      <div className="mt-4">
        <Card title="Fázy" hint="Mesiac začiatku a trvanie upravte podľa zmluvného harmonogramu zhotoviteľa" pad={false}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fáza</th>
                  <th>Skupina</th>
                  <th>Začiatok</th>
                  <th className="num">Trvanie (mes.)</th>
                  <th>Koniec</th>
                  <th className="num">Hotovo %</th>
                  <th>Míľnik pre model</th>
                  <th>Poznámka</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id}>
                    <td style={{ minWidth: 300 }}><TextInput cell value={p.name} onChange={(v) => patch('phases', p.id, { name: v })} ariaLabel="Názov fázy" /></td>
                    <td style={{ minWidth: 120 }}>
                      <Select cell value={p.group} onChange={(v: PhaseGroup) => patch('phases', p.id, { group: v })} ariaLabel="Skupina" options={Object.entries(PHASE_GROUP).map(([value, g]) => ({ value: value as PhaseGroup, label: g.label }))} />
                    </td>
                    <td style={{ minWidth: 118 }}>
                      <Select
                        cell
                        value={String(p.start)}
                        onChange={(v) => patch('phases', p.id, { start: Number(v) })}
                        ariaLabel="Začiatok"
                        options={Array.from({ length: Math.max(total + 12, p.start + 1) }, (_, i) => ({ value: String(i), label: monthLabel(sm, i) }))}
                      />
                    </td>
                    <td className="num" style={{ minWidth: 76 }}><NumInput cell value={p.duration} min={1} max={120} onChange={(v) => patch('phases', p.id, { duration: Math.max(1, Math.round(v)) })} ariaLabel="Trvanie" /></td>
                    <td className="whitespace-nowrap text-ink-2">{monthLabel(sm, p.start + p.duration - 1)}</td>
                    <td className="num" style={{ minWidth: 76 }}><NumInput cell value={p.progress} min={0} max={100} onChange={(v) => patch('phases', p.id, { progress: Math.round(v) })} ariaLabel="Rozpracovanosť" /></td>
                    <td style={{ minWidth: 210 }}>
                      <Select cell value={p.tag ?? ''} onChange={(v) => patch('phases', p.id, { tag: (v || null) as PhaseTag | null })} ariaLabel="Míľnik" options={TAGS} />
                    </td>
                    <td style={{ minWidth: 280 }}><TextInput cell value={p.note} onChange={(v) => patch('phases', p.id, { note: v })} ariaLabel="Poznámka" /></td>
                    <td><IconButton title="Odstrániť fázu" tone="crit" onClick={() => remove('phases', p.id)}><Trash2 size={15} /></IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {data.buildings.length > 1 && (
        <div className="mt-4">
          <Card title="Etapizácia domov" hint="Posun začiatku výstavby jednotlivých domov oproti harmonogramu. Posúva stavebné náklady domu aj splátky jeho kupujúcich.">
            <div className="grid gap-3 sm:grid-cols-3">
              {data.buildings.map((b) => (
                <label key={b.id} className="block">
                  <span className="mb-1 block text-[12.5px] font-medium text-ink-2">{b.name} – posun začiatku</span>
                  <NumInput value={b.startOffset} min={0} max={60} onChange={(v) => patch('buildings', b.id, { startOffset: Math.round(v) })} suffix="mes." />
                  <span className="mt-1 block text-[12px] text-muted">Odovzdanie približne {monthLabel(sm, r.ms.handover + b.startOffset)}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
