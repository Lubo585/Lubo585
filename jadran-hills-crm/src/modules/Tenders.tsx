import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { eur, eurShort, pct, uid } from '../lib/format'
import { useStore } from '../store'
import type { ID, Tender, TenderStatus } from '../types'
import { cx } from '../ui/cx'
import { Badge, Button, Card, Empty, Field, IconButton, PageHead, NumInput, Select, Stat, Tabs, TextInput } from '../ui/kit'
import { TENDER_STATUS } from '../ui/labels'

const KINDS = ['Projektant', 'Zhotoviteľ', 'Subdodávateľ', 'Dozor', 'Geodet', 'Banka', 'Realitná kancelária', 'Advokát', 'Daňový poradca', 'Notár', 'Úrad', 'Siete', 'Investor', 'Iné']

export default function Tenders() {
  const { data, r, patch, add, remove } = useStore()
  const [tab, setTab] = useState<'tenders' | 'contacts'>('tenders')
  const totalOf = new Map(r.boq.sections.map((s) => [s.section.id, s.total]))
  const budgetOf = (t: Tender) => t.sectionIds.reduce((a, id) => a + (totalOf.get(id) ?? 0), 0)

  const winners = data.tenders.map((t) => ({ t, bid: t.bids.find((b) => b.id === t.winnerBidId) })).filter((x) => x.bid)
  const awarded = winners.reduce((a, x) => a + (x.bid?.amount ?? 0), 0)
  const awardedBudget = winners.reduce((a, x) => a + budgetOf(x.t), 0)
  const inPackages = new Set(data.tenders.flatMap((t) => t.sectionIds))
  const uncovered = r.boq.sections.filter((s) => !inPackages.has(s.section.id))

  const updBid = (t: Tender, bidId: ID, x: Partial<Tender['bids'][number]>) => patch('tenders', t.id, { bids: t.bids.map((b) => (b.id === bidId ? { ...b, ...x } : b)) })

  return (
    <>
      <PageHead
        title="Dodávatelia a tendre"
        sub="Tendrové balíky zostavené z oddielov výkazu výmer, porovnanie ponúk s rozpočtom a adresár partnerov projektu."
        actions={
          tab === 'tenders' ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('tenders', { id: uid('tn'), name: 'Nový balík', sectionIds: [], status: 'prep', deadline: null, bids: [], winnerBidId: null, note: '' })}>
              Nový balík
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('contacts', { id: uid('con'), kind: 'Zhotoviteľ', company: '', person: '', role: '', email: '', phone: '', note: '' })}>
              Nový kontakt
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tendrové balíky" value={data.tenders.length} sub={`${data.tenders.filter((t) => t.status === 'contract').length} so zmluvou`} />
        <Stat label="Prijaté ponuky" value={data.tenders.reduce((a, t) => a + t.bids.length, 0)} />
        <Stat label="Vybrané ponuky spolu" value={eurShort(awarded)} sub={awardedBudget > 0 ? `rozpočet týchto balíkov ${eurShort(awardedBudget)}` : 'zatiaľ nič nevybrané'} />
        <Stat
          label="Rozdiel oproti rozpočtu"
          value={awardedBudget > 0 ? `${awarded - awardedBudget >= 0 ? '+' : ''}${pct(((awarded - awardedBudget) / awardedBudget) * 100)}` : '—'}
          tone={awardedBudget > 0 ? (awarded > awardedBudget ? 'crit' : 'good') : 'neutral'}
          sub={awardedBudget > 0 ? eur(awarded - awardedBudget) : undefined}
        />
      </div>

      <div className="mt-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'tenders', label: 'Tendre a ponuky' }, { id: 'contacts', label: `Adresár (${data.contacts.length})` }]} />
      </div>

      {tab === 'tenders' && (
        <div className="mt-3 grid gap-4">
          {uncovered.length > 0 && (
            <div className="rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn-ink">
              Oddiely výkazu výmer mimo tendrových balíkov: {uncovered.map((s) => `${s.section.code} ${s.section.name}`).join(', ')}.
            </div>
          )}
          {data.tenders.length === 0 && <Empty title="Žiadne tendrové balíky" text="Vytvorte balík, priraďte mu oddiely výkazu výmer a zapisujte ponuky zhotoviteľov." />}
          {data.tenders.map((t) => {
            const budget = budgetOf(t)
            const best = t.bids.length ? Math.min(...t.bids.map((b) => b.amount).filter((v) => v > 0)) : 0
            return (
              <Card key={t.id} title={t.name} hint={`Rozpočet podľa výkazu výmer ${eur(budget)}`} action={<Badge tone={t.status === 'contract' ? 'good' : 'accent'}>{TENDER_STATUS[t.status]}</Badge>} pad={false}>
                <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                  <Field label="Názov balíka"><TextInput value={t.name} onChange={(v) => patch('tenders', t.id, { name: v })} /></Field>
                  <Field label="Stav">
                    <Select value={t.status} onChange={(v: TenderStatus) => patch('tenders', t.id, { status: v })} options={Object.entries(TENDER_STATUS).map(([value, label]) => ({ value: value as TenderStatus, label }))} />
                  </Field>
                  <Field label="Termín ponúk"><TextInput type="date" value={t.deadline ?? ''} onChange={(v) => patch('tenders', t.id, { deadline: v || null })} /></Field>
                  <Field label="Poznámka"><TextInput value={t.note} onChange={(v) => patch('tenders', t.id, { note: v })} /></Field>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Oddiely výkazu výmer v balíku</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.boqSections.map((s) => {
                        const on = t.sectionIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => patch('tenders', t.id, { sectionIds: on ? t.sectionIds.filter((x) => x !== s.id) : [...t.sectionIds, s.id] })}
                            className={cx('h-8 cursor-pointer rounded-md border px-2.5 text-[12.5px]', on ? 'border-accent-fill bg-accent-fill text-accent-ink' : 'border-line-2 bg-surface text-ink-2 hover:bg-surface-2')}
                            title={eur(totalOf.get(s.id) ?? 0)}
                          >
                            {s.code} {s.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="tbl-wrap border-t border-line">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Vybraná</th>
                        <th>Uchádzač</th>
                        <th className="num">Cena ponuky</th>
                        <th className="num">Oproti rozpočtu</th>
                        <th className="num">Lehota (týždne)</th>
                        <th>Poznámka</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {t.bids.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-muted">Zatiaľ bez ponúk.</td>
                        </tr>
                      )}
                      {t.bids.map((b) => {
                        const diff = budget > 0 && b.amount > 0 ? ((b.amount - budget) / budget) * 100 : null
                        return (
                          <tr key={b.id}>
                            <td>
                              <input
                                type="radio"
                                name={`win_${t.id}`}
                                className="h-4 w-4 accent-[var(--accent)]"
                                checked={t.winnerBidId === b.id}
                                onChange={() => patch('tenders', t.id, { winnerBidId: b.id })}
                                aria-label={`Vybrať ponuku ${b.supplier}`}
                              />
                            </td>
                            <td style={{ minWidth: 220 }}>
                              <TextInput cell value={b.supplier} onChange={(v) => updBid(t, b.id, { supplier: v })} ariaLabel="Uchádzač" />
                            </td>
                            <td className="num" style={{ minWidth: 120 }}>
                              <NumInput cell value={b.amount} onChange={(v) => updBid(t, b.id, { amount: v })} ariaLabel="Cena ponuky" />
                            </td>
                            <td className={cx('num', diff !== null && diff > 0 && 'text-crit-ink', diff !== null && diff <= 0 && 'text-good-ink')}>
                              {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${pct(diff)}`}
                              {b.amount > 0 && b.amount === best && t.bids.length > 1 && <span className="ml-1.5"><Badge tone="good">najnižšia</Badge></span>}
                            </td>
                            <td className="num" style={{ minWidth: 80 }}><NumInput cell value={b.weeks} onChange={(v) => updBid(t, b.id, { weeks: Math.round(v) })} ariaLabel="Lehota výstavby v týždňoch" /></td>
                            <td style={{ minWidth: 260 }}><TextInput cell value={b.note} onChange={(v) => updBid(t, b.id, { note: v })} ariaLabel="Poznámka" /></td>
                            <td>
                              <IconButton title="Odstrániť ponuku" tone="crit" onClick={() => patch('tenders', t.id, { bids: t.bids.filter((x) => x.id !== b.id), winnerBidId: t.winnerBidId === b.id ? null : t.winnerBidId })}>
                                <Trash2 size={15} />
                              </IconButton>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="no-print flex flex-wrap justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
                  <Button size="sm" icon={<Plus size={15} />} onClick={() => patch('tenders', t.id, { bids: [...t.bids, { id: uid('bid'), contactId: null, supplier: '', amount: 0, weeks: 0, note: '' }] })}>
                    Pridať ponuku
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={() => remove('tenders', t.id)}>Odstrániť balík</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="mt-3">
          <Card pad={false}>
            {data.contacts.length === 0 ? (
              <div className="p-4"><Empty title="Adresár je prázdny" text="Pridajte projektantov, zhotoviteľov, banku, advokáta a ďalších partnerov projektu." /></div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Typ</th><th>Firma / inštitúcia</th><th>Osoba</th><th>Úloha v projekte</th><th>E-mail</th><th>Telefón</th><th>Poznámka</th><th /></tr>
                  </thead>
                  <tbody>
                    {data.contacts.map((c) => (
                      <tr key={c.id}>
                        <td style={{ minWidth: 150 }}>
                          <Select cell value={c.kind} onChange={(v) => patch('contacts', c.id, { kind: v })} ariaLabel="Typ kontaktu" options={[...new Set([...KINDS, c.kind])].map((k) => ({ value: k, label: k }))} />
                        </td>
                        <td style={{ minWidth: 220 }}><TextInput cell value={c.company} onChange={(v) => patch('contacts', c.id, { company: v })} ariaLabel="Firma" /></td>
                        <td style={{ minWidth: 220 }}><TextInput cell value={c.person} onChange={(v) => patch('contacts', c.id, { person: v })} ariaLabel="Osoba" /></td>
                        <td style={{ minWidth: 260 }}><TextInput cell value={c.role} onChange={(v) => patch('contacts', c.id, { role: v })} ariaLabel="Úloha" /></td>
                        <td style={{ minWidth: 200 }}><TextInput cell type="email" value={c.email} onChange={(v) => patch('contacts', c.id, { email: v })} ariaLabel="E-mail" /></td>
                        <td style={{ minWidth: 150 }}><TextInput cell type="tel" value={c.phone} onChange={(v) => patch('contacts', c.id, { phone: v })} ariaLabel="Telefón" /></td>
                        <td style={{ minWidth: 240 }}><TextInput cell value={c.note} onChange={(v) => patch('contacts', c.id, { note: v })} ariaLabel="Poznámka" /></td>
                        <td><IconButton title="Odstrániť kontakt" tone="crit" onClick={() => remove('contacts', c.id)}><Trash2 size={15} /></IconButton></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
