import { CalendarClock, Download, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { isSold, listPrice } from '../lib/calc'
import { addMonths, daysUntil, eur, eurShort, fmtDate, todayIso, uid } from '../lib/format'
import { exportCsv } from '../lib/export'
import { useStore } from '../store'
import type { ActivityKind, Client, ID, PipelineStage, UnitStatus } from '../types'
import { cx } from '../ui/cx'
import { Badge, Button, Card, Empty, Field, IconButton, Modal, NumInput, PageHead, Select, Stat, Tabs, TextArea, TextInput } from '../ui/kit'
import { ACTIVITY, PIPELINE, pipelineLabel, UNIT_STATUS } from '../ui/labels'

const SOURCES = ['Web projektu', 'Realitná kancelária', 'Portál nehnuteľností', 'Odporúčanie', 'Sociálne siete', 'Tabuľa na stavbe', 'Iné']
const STAGE_TO_UNIT: Partial<Record<PipelineStage, UnitStatus>> = { reservation: 'reserved', precontract: 'precontract', contract: 'sold' }

const blank = (): Client => ({
  id: uid('cl'), name: '', email: '', phone: '', country: '', language: '', source: SOURCES[0], agent: '', budget: 0, unitIds: [],
  stage: 'new', nextDate: null, nextAction: '', note: '', createdAt: todayIso(),
})

function isoFromMonth(startMonth: string, idx: number): string {
  const { y, m } = addMonths(startMonth, idx)
  return `${y}-${String(m).padStart(2, '0')}-15`
}

export default function Clients() {
  const { data, r, set, patch, add, remove } = useStore()
  const [tab, setTab] = useState<'pipeline' | 'list' | 'payments'>('pipeline')
  const [editing, setEditing] = useState<Client | null>(null)
  const [isNew, setIsNew] = useState(false)
  const s = data.settings
  const unitLabel = (id: ID) => data.units.find((u) => u.id === id)?.label ?? '?'

  const open = (c: Client) => {
    setEditing({ ...c })
    setIsNew(false)
  }
  const create = () => {
    setEditing(blank())
    setIsNew(true)
  }
  const save = () => {
    if (!editing || !editing.name.trim()) return
    if (isNew) add('clients', editing)
    else patch('clients', editing.id, editing)
    setEditing(null)
  }
  const del = (id: ID) => {
    set((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== id),
      activities: d.activities.filter((a) => a.clientId !== id),
      units: d.units.map((u) => (u.clientId === id ? { ...u, clientId: null } : u)),
    }))
    setEditing(null)
  }

  /** Priradí jednotku klientovi a nastaví jej stav podľa fázy obchodu. */
  const assign = (clientId: ID, unitId: ID, status: UnitStatus) => {
    const u = data.units.find((x) => x.id === unitId)
    if (!u) return
    patch('units', unitId, { status, clientId, saleDate: u.saleDate ?? todayIso(), soldPrice: u.soldPrice ?? listPrice(u, s) })
  }

  const makeSchedule = (unitId: ID) => {
    const uc = r.units.find((x) => x.unit.id === unitId)
    if (!uc) return
    const off = uc.building?.startOffset ?? 0
    const total = uc.price
    const dep = Math.round((total * s.sales.depositPct) / 100)
    const shell = Math.round((total * s.sales.shellPct) / 100)
    const base = { unitId, clientId: uc.unit.clientId, paid: false, paidDate: null }
    set((d) => ({
      ...d,
      payments: [
        ...d.payments,
        { ...base, id: uid('pay'), label: 'Záloha pri podpise', due: uc.unit.saleDate ?? todayIso(), amount: dep },
        { ...base, id: uid('pay'), label: 'Splátka po dokončení hrubej stavby', due: isoFromMonth(s.startMonth, Math.max(uc.saleMonth, r.ms.shell + off)), amount: shell },
        { ...base, id: uid('pay'), label: 'Doplatok pri odovzdaní', due: isoFromMonth(s.startMonth, Math.max(uc.saleMonth + 1, r.ms.handover + off)), amount: total - dep - shell },
      ],
    }))
  }

  const today = todayIso()
  const payTotal = data.payments.reduce((a, p) => a + p.amount, 0)
  const payPaid = data.payments.filter((p) => p.paid).reduce((a, p) => a + p.amount, 0)
  const payOverdue = data.payments.filter((p) => !p.paid && p.due < today).reduce((a, p) => a + p.amount, 0)
  const soldUnits = r.units.filter((u) => u.sold)
  const active = data.clients.filter((c) => c.stage !== 'lost')

  const csv = () =>
    exportCsv('klienti.csv', [
      ['Meno', 'E-mail', 'Telefón', 'Krajina', 'Jazyk', 'Zdroj', 'Sprostredkovateľ', 'Rozpočet €', 'Fáza', 'Jednotky', 'Ďalší krok', 'Termín', 'Poznámka', 'Vytvorený'],
      ...data.clients.map((c) => [c.name, c.email, c.phone, c.country, c.language, c.source, c.agent, c.budget, pipelineLabel(c.stage), c.unitIds.map(unitLabel).join(', '), c.nextAction, c.nextDate ?? '', c.note, c.createdAt]),
    ])

  return (
    <>
      <PageHead
        title="Klienti a obchod"
        sub="Záujemcovia a kupujúci od prvého kontaktu po kúpnu zmluvu, história komunikácie a splátkové kalendáre."
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={csv}>Export CSV</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={create}>Nový klient</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Aktívni záujemcovia" value={active.length} sub={`${data.clients.length - active.length} stratených`} />
        <Stat label="Rezervácie a zmluvy" value={`${r.revenue.soldCount} / ${data.units.length}`} sub={eurShort(r.revenue.soldGross)} />
        <Stat label="Uhradené splátky" value={eurShort(payPaid)} sub={`z ${eurShort(payTotal)} v kalendároch`} />
        <Stat label="Splátky po splatnosti" value={eurShort(payOverdue)} tone={payOverdue > 0 ? 'crit' : 'neutral'} />
      </div>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pipeline', label: 'Obchodné fázy' },
            { id: 'list', label: 'Zoznam klientov' },
            { id: 'payments', label: 'Splátkové kalendáre' },
          ]}
        />
      </div>

      <div key={tab} className="mt-4">
        {tab === 'pipeline' &&
          (data.clients.length === 0 ? (
            <Empty title="Zatiaľ žiadni klienti" text="Pridajte prvého záujemcu. Každý klient má fázu obchodu, jednotky záujmu, ďalší krok s termínom a históriu komunikácie." action={<Button variant="primary" icon={<Plus size={15} />} onClick={create}>Nový klient</Button>} />
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              <div className="grid min-w-max grid-flow-col auto-cols-[244px] gap-3">
                {PIPELINE.map((st) => {
                  const list = data.clients.filter((c) => c.stage === st.id)
                  return (
                    <section key={st.id} className="rounded-xl border border-line bg-surface-2 p-2.5">
                      <header className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold">
                        <span>{st.label}</span>
                        <span className="text-muted">{list.length}</span>
                      </header>
                      <div className="grid gap-2">
                        {list.map((c) => {
                          const d = daysUntil(c.nextDate)
                          return (
                            <button key={c.id} type="button" onClick={() => open(c)} className="w-full cursor-pointer rounded-lg border border-line bg-surface p-2.5 text-left text-[13px] shadow-[var(--shadow)] hover:border-line-2">
                              <div className="font-semibold">{c.name}</div>
                              <div className="mt-0.5 text-[12px] text-muted">{[c.country, c.source].filter(Boolean).join(' · ')}</div>
                              {c.unitIds.length > 0 && <div className="mt-1.5 text-[12.5px] text-ink-2">Záujem: {c.unitIds.map(unitLabel).join(', ')}</div>}
                              {c.budget > 0 && <div className="text-[12.5px] text-ink-2">Rozpočet {eur(c.budget)}</div>}
                              {c.nextAction && (
                                <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px]">
                                  <CalendarClock size={13} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                                  <span className={cx(d !== null && d < 0 && 'text-crit-ink')}>
                                    {c.nextAction}
                                    {c.nextDate ? ` · ${fmtDate(c.nextDate)}` : ''}
                                  </span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                        {list.length === 0 && <div className="px-1 py-3 text-[12.5px] text-muted">—</div>}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          ))}

        {tab === 'list' && (
          <Card pad={false}>
            {data.clients.length === 0 ? (
              <div className="p-4"><Empty title="Zatiaľ žiadni klienti" /></div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Meno</th><th>Kontakt</th><th>Krajina</th><th>Zdroj</th><th>Fáza</th><th>Jednotky</th><th className="num">Rozpočet</th><th>Ďalší krok</th><th>Termín</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clients.map((c) => {
                      const d = daysUntil(c.nextDate)
                      return (
                        <tr key={c.id} className="cursor-pointer" onClick={() => open(c)}>
                          <td className="font-medium">
                            <button type="button" className="cursor-pointer text-left font-medium text-accent" onClick={(e) => { e.stopPropagation(); open(c) }}>{c.name}</button>
                          </td>
                          <td className="text-ink-2">{[c.email, c.phone].filter(Boolean).join(' · ') || '—'}</td>
                          <td>{c.country || '—'}</td>
                          <td>{c.source}</td>
                          <td><Badge tone={c.stage === 'lost' ? 'neutral' : c.stage === 'contract' ? 'good' : 'accent'}>{pipelineLabel(c.stage)}</Badge></td>
                          <td>{c.unitIds.map(unitLabel).join(', ') || '—'}</td>
                          <td className="num">{c.budget ? eur(c.budget) : '—'}</td>
                          <td>{c.nextAction || '—'}</td>
                          <td>{c.nextDate ? <Badge tone={d !== null && d < 0 ? 'crit' : 'neutral'}>{fmtDate(c.nextDate)}</Badge> : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'payments' && (
          <div className="grid gap-4">
            {soldUnits.length === 0 && (
              <Empty title="Zatiaľ žiadne rezervácie ani zmluvy" text="Keď jednotku označíte ako rezervovanú alebo predanú, môžete jej tu vytvoriť splátkový kalendár. Skutočné splátky potom nahradia štandardný predpoklad v cash-flow." />
            )}
            {soldUnits.map((uc) => {
              const pays = data.payments.filter((p) => p.unitId === uc.unit.id).sort((a, b) => a.due.localeCompare(b.due))
              const client = data.clients.find((c) => c.id === uc.unit.clientId)
              const sum = pays.reduce((a, p) => a + p.amount, 0)
              return (
                <Card
                  key={uc.unit.id}
                  title={`Byt ${uc.unit.label} · ${UNIT_STATUS[uc.unit.status].label}`}
                  hint={`${client ? client.name : 'bez priradeného klienta'} · zmluvná cena ${eur(uc.price)}`}
                  action={
                    <>
                      {pays.length === 0 && <Button size="sm" variant="soft" onClick={() => makeSchedule(uc.unit.id)}>Vytvoriť štandardný kalendár</Button>}
                      <Button size="sm" icon={<Plus size={15} />} onClick={() => add('payments', { id: uid('pay'), unitId: uc.unit.id, clientId: uc.unit.clientId, label: 'Splátka', due: today, amount: 0, paid: false, paidDate: null })}>
                        Splátka
                      </Button>
                    </>
                  }
                  pad={false}
                >
                  {pays.length === 0 ? (
                    <p className="m-0 px-4 pb-4 text-[13px] text-muted sm:px-5">
                      Bez kalendára sa v cash-flow použije štandard: {s.sales.depositPct} % pri podpise, {s.sales.shellPct} % po hrubej stavbe, {s.sales.finalPct} % pri odovzdaní.
                    </p>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead>
                          <tr><th>Splátka</th><th>Splatnosť</th><th className="num">Suma</th><th>Uhradené</th><th>Dátum úhrady</th><th /></tr>
                        </thead>
                        <tbody>
                          {pays.map((p) => (
                            <tr key={p.id}>
                              <td style={{ minWidth: 220 }}><TextInput cell value={p.label} onChange={(v) => patch('payments', p.id, { label: v })} ariaLabel="Názov splátky" /></td>
                              <td style={{ minWidth: 136 }}><TextInput cell type="date" value={p.due} onChange={(v) => v && patch('payments', p.id, { due: v })} ariaLabel="Splatnosť" /></td>
                              <td className="num" style={{ minWidth: 110 }}><NumInput cell value={p.amount} onChange={(v) => patch('payments', p.id, { amount: v })} ariaLabel="Suma" /></td>
                              <td>
                                <label className="inline-flex cursor-pointer items-center gap-2">
                                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={p.paid} onChange={(e) => patch('payments', p.id, { paid: e.target.checked, paidDate: e.target.checked ? (p.paidDate ?? today) : null })} />
                                  {p.paid ? <Badge tone="good">Uhradené</Badge> : p.due < today ? <Badge tone="crit">Po splatnosti</Badge> : <Badge>Čaká</Badge>}
                                </label>
                              </td>
                              <td style={{ minWidth: 136 }}>{p.paid ? <TextInput cell type="date" value={p.paidDate ?? ''} onChange={(v) => patch('payments', p.id, { paidDate: v || null })} ariaLabel="Dátum úhrady" /> : <span className="text-muted">—</span>}</td>
                              <td><IconButton title="Odstrániť splátku" tone="crit" onClick={() => remove('payments', p.id)}><Trash2 size={15} /></IconButton></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2}>Spolu v kalendári</td>
                            <td className="num">{eur(sum)}</td>
                            <td colSpan={3} className={cx(Math.abs(sum - uc.price) > 1 && 'text-warn-ink')}>
                              {Math.abs(sum - uc.price) > 1 ? `Rozdiel oproti zmluvnej cene: ${eur(uc.price - sum)}` : 'Zodpovedá zmluvnej cene'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <Modal
          wide
          title={isNew ? 'Nový klient' : editing.name || 'Klient'}
          onClose={() => setEditing(null)}
          footer={
            <>
              {!isNew && <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => del(editing.id)}>Odstrániť</Button>}
              <Button onClick={() => setEditing(null)}>Zrušiť</Button>
              <Button variant="primary" onClick={save} disabled={!editing.name.trim()}>Uložiť</Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meno a priezvisko / firma"><TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} /></Field>
            <Field label="Fáza obchodu">
              <Select value={editing.stage} onChange={(v) => setEditing({ ...editing, stage: v })} options={PIPELINE.map((p) => ({ value: p.id, label: p.label }))} />
            </Field>
            <Field label="E-mail"><TextInput type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} /></Field>
            <Field label="Telefón"><TextInput type="tel" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} /></Field>
            <Field label="Krajina"><TextInput value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} /></Field>
            <Field label="Jazyk komunikácie"><TextInput value={editing.language} onChange={(v) => setEditing({ ...editing, language: v })} /></Field>
            <Field label="Zdroj kontaktu">
              <Select value={editing.source} onChange={(v) => setEditing({ ...editing, source: v })} options={[...new Set([...SOURCES, editing.source])].map((x) => ({ value: x, label: x }))} />
            </Field>
            <Field label="Realitná kancelária / maklér"><TextInput value={editing.agent} onChange={(v) => setEditing({ ...editing, agent: v })} /></Field>
            <Field label="Rozpočet"><NumInput value={editing.budget} onChange={(v) => setEditing({ ...editing, budget: v })} suffix="€" /></Field>
            <Field label="Termín ďalšieho kroku"><TextInput type="date" value={editing.nextDate ?? ''} onChange={(v) => setEditing({ ...editing, nextDate: v || null })} /></Field>
            <Field label="Ďalší krok" className="sm:col-span-2"><TextInput value={editing.nextAction} onChange={(v) => setEditing({ ...editing, nextAction: v })} placeholder="napr. poslať ponuku na A7 a dohodnúť obhliadku" /></Field>
            <Field label="Poznámka" className="sm:col-span-2"><TextArea value={editing.note} onChange={(v) => setEditing({ ...editing, note: v })} /></Field>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Jednotky, o ktoré má záujem</div>
            <div className="flex flex-wrap gap-1.5">
              {data.units.map((u) => {
                const on = editing.unitIds.includes(u.id)
                const taken = isSold(u) && u.clientId !== null && u.clientId !== editing.id
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={on}
                    title={taken ? `${UNIT_STATUS[u.status].label} – iný klient` : u.layout}
                    onClick={() => setEditing({ ...editing, unitIds: on ? editing.unitIds.filter((x) => x !== u.id) : [...editing.unitIds, u.id] })}
                    className={cx(
                      'h-8 cursor-pointer rounded-md border px-2.5 text-[12.5px] font-medium',
                      on ? 'border-accent-fill bg-accent-fill text-accent-ink' : 'border-line-2 bg-surface text-ink-2 hover:bg-surface-2',
                      taken && !on && 'opacity-50',
                    )}
                  >
                    {u.label}
                  </button>
                )
              })}
            </div>
            {!isNew && STAGE_TO_UNIT[editing.stage] && editing.unitIds.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-ink-2">Nastaviť stav jednotky:</span>
                {editing.unitIds.map((id) => {
                  const u = data.units.find((x) => x.id === id)
                  const target = STAGE_TO_UNIT[editing.stage]
                  if (!u || !target) return null
                  const mine = u.clientId === editing.id && u.status === target
                  return (
                    <Button key={id} size="sm" variant={mine ? 'ghost' : 'soft'} disabled={mine || (isSold(u) && u.clientId !== null && u.clientId !== editing.id)} onClick={() => assign(editing.id, id, target)}>
                      {mine ? `${u.label} – ${UNIT_STATUS[target].label.toLowerCase()}` : `${u.label} → ${UNIT_STATUS[target].label.toLowerCase()}`}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {!isNew && <Activities clientId={editing.id} />}
        </Modal>
      )}
    </>
  )
}

function Activities({ clientId }: { clientId: ID }) {
  const { data, add, remove } = useStore()
  const [kind, setKind] = useState<ActivityKind>('call')
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayIso())
  const list = data.activities.filter((a) => a.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date))
  const submit = () => {
    if (!text.trim()) return
    add('activities', { id: uid('act'), clientId, date, kind, text: text.trim() })
    setText('')
  }
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="mb-2 text-[13px] font-semibold">História komunikácie</div>
      <div className="grid gap-2 sm:grid-cols-[140px_150px_1fr_auto]">
        <TextInput type="date" value={date} onChange={(v) => v && setDate(v)} ariaLabel="Dátum aktivity" />
        <Select value={kind} onChange={setKind} ariaLabel="Typ aktivity" options={Object.entries(ACTIVITY).map(([value, label]) => ({ value: value as ActivityKind, label }))} />
        <TextInput value={text} onChange={setText} placeholder="Čo sa dohodlo…" ariaLabel="Popis aktivity" />
        <Button variant="soft" onClick={submit} disabled={!text.trim()}>Zapísať</Button>
      </div>
      {list.length > 0 && (
        <ul className="m-0 mt-3 grid list-none gap-2 p-0 text-[13px]">
          {list.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
              <span className="min-w-0">
                <span className="text-muted">{fmtDate(a.date)} · {ACTIVITY[a.kind]}</span>
                <span className="block break-words">{a.text}</span>
              </span>
              <IconButton title="Odstrániť záznam" tone="crit" onClick={() => remove('activities', a.id)}><Trash2 size={14} /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
