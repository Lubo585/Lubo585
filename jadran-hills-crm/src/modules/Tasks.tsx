import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { daysUntil, todayIso, uid } from '../lib/format'
import { useStore } from '../store'
import type { TaskStatus } from '../types'
import { Badge, Button, Card, Empty, IconButton, PageHead, Select, Stat, TextInput } from '../ui/kit'
import { TASK_STATUS } from '../ui/labels'

const PRIORITY = [
  { value: '1', label: 'Vysoká' },
  { value: '2', label: 'Stredná' },
  { value: '3', label: 'Nízka' },
]

export default function Tasks() {
  const { data, patch, add, remove } = useStore()
  const [show, setShow] = useState<'open' | 'all'>('open')
  const [area, setArea] = useState('all')
  const areas = [...new Set(data.tasks.map((t) => t.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))
  const open = data.tasks.filter((t) => t.status !== 'done')
  const overdue = open.filter((t) => (daysUntil(t.due) ?? 1) < 0).length
  const soon = open.filter((t) => {
    const d = daysUntil(t.due)
    return d !== null && d >= 0 && d <= 14
  }).length

  const rows = data.tasks
    .filter((t) => (show === 'all' || t.status !== 'done') && (area === 'all' || t.area === area))
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.priority - b.priority)

  return (
    <>
      <PageHead
        title="Úlohy"
        sub="Čo treba urobiť, kto to má na starosti a dokedy."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('tasks', { id: uid('task'), title: 'Nová úloha', area: area === 'all' ? '' : area, owner: '', due: todayIso(), priority: 2, status: 'todo', note: '' })}>
            Nová úloha
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Otvorené" value={open.length} />
        <Stat label="Po termíne" value={overdue} tone={overdue > 0 ? 'crit' : 'neutral'} />
        <Stat label="Do 14 dní" value={soon} tone={soon > 0 ? 'warn' : 'neutral'} />
        <Stat label="Hotové" value={data.tasks.length - open.length} />
      </div>

      <div className="mt-4">
        <Card
          action={
            <>
              <Select auto value={show} onChange={setShow} ariaLabel="Zobrazenie" options={[{ value: 'open', label: 'Len otvorené' }, { value: 'all', label: 'Všetky' }]} />
              <Select auto value={area} onChange={setArea} ariaLabel="Oblasť" options={[{ value: 'all', label: 'Všetky oblasti' }, ...areas.map((a) => ({ value: a, label: a }))]} />
            </>
          }
          title="Zoznam úloh"
          pad={false}
        >
          {rows.length === 0 ? (
            <div className="p-4"><Empty title="Žiadne úlohy" text="V tomto zobrazení nie sú žiadne úlohy." /></div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Hotovo</th><th>Úloha</th><th>Oblasť</th><th>Zodpovedá</th><th>Termín</th><th>Priorita</th><th>Stav</th><th>Poznámka</th><th /></tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const d = t.status === 'done' ? null : daysUntil(t.due)
                    return (
                      <tr key={t.id} style={t.status === 'done' ? { opacity: 0.6 } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--accent)]"
                            checked={t.status === 'done'}
                            aria-label={`Označiť úlohu „${t.title}“ ako hotovú`}
                            onChange={(e) => patch('tasks', t.id, { status: e.target.checked ? 'done' : 'todo' })}
                          />
                        </td>
                        <td style={{ minWidth: 340 }}><TextInput cell value={t.title} onChange={(v) => patch('tasks', t.id, { title: v })} ariaLabel="Názov úlohy" /></td>
                        <td style={{ minWidth: 130 }}><TextInput cell value={t.area} onChange={(v) => patch('tasks', t.id, { area: v })} ariaLabel="Oblasť" /></td>
                        <td style={{ minWidth: 130 }}><TextInput cell value={t.owner} onChange={(v) => patch('tasks', t.id, { owner: v })} ariaLabel="Zodpovedná osoba" /></td>
                        <td style={{ minWidth: 170 }}>
                          <span className="flex items-center gap-1.5">
                            <TextInput cell type="date" value={t.due ?? ''} onChange={(v) => patch('tasks', t.id, { due: v || null })} ariaLabel="Termín" />
                            {d !== null && d < 0 && <Badge tone="crit">{-d} d</Badge>}
                          </span>
                        </td>
                        <td style={{ minWidth: 100 }}>
                          <Select cell value={String(t.priority)} onChange={(v) => patch('tasks', t.id, { priority: Number(v) as 1 | 2 | 3 })} options={PRIORITY} ariaLabel="Priorita" />
                        </td>
                        <td style={{ minWidth: 130 }}>
                          <Select cell value={t.status} onChange={(v: TaskStatus) => patch('tasks', t.id, { status: v })} ariaLabel="Stav" options={Object.entries(TASK_STATUS).map(([value, s]) => ({ value: value as TaskStatus, label: s.label }))} />
                        </td>
                        <td style={{ minWidth: 300 }}><TextInput cell value={t.note} onChange={(v) => patch('tasks', t.id, { note: v })} ariaLabel="Poznámka" /></td>
                        <td><IconButton title="Odstrániť úlohu" tone="crit" onClick={() => remove('tasks', t.id)}><Trash2 size={15} /></IconButton></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
