import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { daysUntil, todayIso, uid } from '../lib/format'
import { useStore } from '../store'
import type { CheckStatus } from '../types'
import { AutoText, Badge, Button, Card, Empty, IconButton, Meter, PageHead, Select, Stat, Tabs, TextInput } from '../ui/kit'
import { CHECK } from '../ui/labels'

export default function Permits() {
  const { data, patch, add, remove } = useStore()
  const [tab, setTab] = useState<'check' | 'docs'>('check')
  const groups = [...new Set(data.permits.map((p) => p.group))]
  const relevant = data.permits.filter((p) => p.status !== 'na')
  const done = relevant.filter((p) => p.status === 'done').length
  const overdue = relevant.filter((p) => p.status !== 'done' && (daysUntil(p.due) ?? 1) < 0).length
  const categories = [...new Set(data.documents.map((d) => d.category))]

  return (
    <>
      <PageHead
        title="Povolenia a dokumenty"
        sub="Kontrolný zoznam krokov od stavebného povolenia po zápis bytov do pozemkovej knihy a register dokumentov projektu."
        actions={
          tab === 'check' ? (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('permits', { id: uid('per'), group: groups[0] ?? 'Pred začatím stavby', name: 'Nový krok', nameLocal: '', authority: '', status: 'todo', due: null, doneDate: null, note: '' })}>
              Nový krok
            </Button>
          ) : (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('documents', { id: uid('doc'), category: categories[0] ?? 'Ostatné', title: 'Nový dokument', buildingCode: '', url: '', note: '' })}>
              Nový dokument
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Splnené kroky" value={`${done} / ${relevant.length}`} />
        <Stat label="Prebieha" value={relevant.filter((p) => p.status === 'progress').length} />
        <Stat label="Po termíne" value={overdue} tone={overdue > 0 ? 'crit' : 'neutral'} />
        <Stat label="Dokumenty" value={data.documents.length} />
      </div>

      <div className="mt-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'check', label: 'Kontrolný zoznam' }, { id: 'docs', label: 'Dokumenty' }]} />
      </div>

      {tab === 'check' && (
        <div className="mt-3 grid gap-4">
          {groups.map((g) => {
            const items = data.permits.filter((p) => p.group === g)
            const rel = items.filter((p) => p.status !== 'na')
            const d = rel.filter((p) => p.status === 'done').length
            return (
              <Card
                key={g}
                title={g}
                action={
                  <div className="flex w-40 items-center gap-2 text-[12.5px] text-ink-2">
                    <Meter value={d} max={rel.length} tone="good" label={`Splnené kroky – ${g}`} />
                    <span className="shrink-0 tabular-nums">{d}/{rel.length}</span>
                  </div>
                }
                pad={false}
              >
                <ul className="m-0 list-none border-t border-line p-0">
                  {items.map((p) => {
                    const days = p.status !== 'done' && p.status !== 'na' ? daysUntil(p.due) : null
                    return (
                      <li key={p.id} className="grid items-start gap-x-3 gap-y-1 border-b border-line px-3 py-2.5 last:border-0 sm:px-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_128px_150px_150px_28px]" style={p.status === 'na' ? { opacity: 0.6 } : undefined}>
                        <div className="min-w-0">
                          <div className="font-medium"><TextInput cell value={p.name} onChange={(v) => patch('permits', p.id, { name: v })} ariaLabel="Názov kroku" /></div>
                          <div className="text-[12.5px] italic text-muted"><TextInput cell value={p.nameLocal} onChange={(v) => patch('permits', p.id, { nameLocal: v })} placeholder="úradný názov" ariaLabel="Úradný názov" /></div>
                        </div>
                        <div className="min-w-0">
                          <TextInput cell value={p.authority} onChange={(v) => patch('permits', p.id, { authority: v })} placeholder="kto vybavuje" ariaLabel="Zodpovedný subjekt" />
                        </div>
                        <div>
                          <span className="hidden print:inline"><Badge tone={CHECK[p.status].tone}>{CHECK[p.status].label}</Badge></span>
                          <span className="print:hidden">
                            <Select
                              cell
                              value={p.status}
                              onChange={(v: CheckStatus) => patch('permits', p.id, { status: v, doneDate: v === 'done' ? (p.doneDate ?? todayIso()) : null })}
                              ariaLabel="Stav"
                              options={Object.entries(CHECK).map(([value, c]) => ({ value: value as CheckStatus, label: c.label }))}
                            />
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TextInput cell type="date" value={p.due ?? ''} onChange={(v) => patch('permits', p.id, { due: v || null })} ariaLabel="Termín" />
                          {days !== null && days < 0 && <Badge tone="crit">po termíne</Badge>}
                        </div>
                        <div>
                          {p.status === 'done' ? <TextInput cell type="date" value={p.doneDate ?? ''} onChange={(v) => patch('permits', p.id, { doneDate: v || null })} ariaLabel="Dátum splnenia" /> : <span className="hidden px-1.5 text-[12.5px] text-muted md:inline">nesplnené</span>}
                        </div>
                        <div><IconButton title="Odstrániť krok" tone="crit" onClick={() => remove('permits', p.id)}><Trash2 size={15} /></IconButton></div>
                        <div className="text-[13px] text-ink-2 md:col-span-6">
                          <AutoText value={p.note} onChange={(v) => patch('permits', p.id, { note: v })} placeholder="Poznámka" ariaLabel="Poznámka" perRow={130} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'docs' && (
        <div className="mt-3">
          {data.documents.length === 0 ? (
            <Empty title="Žiadne dokumenty" text="Evidujte odkazy na projektovú dokumentáciu, povolenia, zmluvy a posudky – napríklad na Disku Google." />
          ) : (
            <Card pad={false}>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Kategória</th><th>Dokument</th><th>Dom</th><th>Odkaz</th><th>Poznámka</th><th /></tr>
                  </thead>
                  <tbody>
                    {[...data.documents]
                      .sort((a, b) => a.category.localeCompare(b.category, 'sk') || a.title.localeCompare(b.title, 'sk'))
                      .map((d) => (
                        <tr key={d.id}>
                          <td style={{ minWidth: 220 }}><TextInput cell value={d.category} onChange={(v) => patch('documents', d.id, { category: v })} ariaLabel="Kategória" /></td>
                          <td style={{ minWidth: 300 }}><TextInput cell value={d.title} onChange={(v) => patch('documents', d.id, { title: v })} ariaLabel="Názov dokumentu" /></td>
                          <td style={{ minWidth: 70 }}>
                            <Select cell value={d.buildingCode} onChange={(v) => patch('documents', d.id, { buildingCode: v })} ariaLabel="Dom" options={[{ value: '', label: '—' }, ...data.buildings.map((b) => ({ value: b.code, label: b.code }))]} />
                          </td>
                          <td style={{ minWidth: 240 }}>
                            <span className="flex items-center gap-1">
                              <TextInput cell type="url" value={d.url} onChange={(v) => patch('documents', d.id, { url: v })} placeholder="https://…" ariaLabel="Odkaz" />
                              {/^https?:\/\//.test(d.url) && (
                                <a href={d.url} target="_blank" rel="noopener noreferrer" title="Otvoriť dokument" aria-label={`Otvoriť ${d.title}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-2">
                                  <ExternalLink size={15} />
                                </a>
                              )}
                            </span>
                          </td>
                          <td style={{ minWidth: 280 }}><TextInput cell value={d.note} onChange={(v) => patch('documents', d.id, { note: v })} ariaLabel="Poznámka" /></td>
                          <td><IconButton title="Odstrániť dokument" tone="crit" onClick={() => remove('documents', d.id)}><Trash2 size={15} /></IconButton></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
