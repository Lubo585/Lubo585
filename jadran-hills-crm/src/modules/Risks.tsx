import { Plus, Trash2 } from 'lucide-react'
import { uid } from '../lib/format'
import { useStore } from '../store'
import type { RiskStatus } from '../types'
import { AutoText, Badge, Button, Card, IconButton, PageHead, Select, Stat, TextInput } from '../ui/kit'
import { RISK_STATUS, riskTone } from '../ui/labels'

const LEVELS = [1, 2, 3, 4, 5]
const LEVEL_OPTS = LEVELS.map((v) => ({ value: String(v), label: String(v) }))
const cellBg = { good: 'var(--good-soft)', warn: 'var(--warn-soft)', crit: 'var(--crit-soft)', neutral: 'var(--surface-2)', accent: 'var(--accent-soft)' }

export default function Risks() {
  const { data, patch, add, remove } = useStore()
  const open = data.risks.filter((x) => x.status !== 'closed')
  const sorted = [...data.risks].sort((a, b) => b.probability * b.impact - a.probability * a.impact)
  const high = open.filter((x) => x.probability * x.impact >= 15).length
  const mid = open.filter((x) => x.probability * x.impact >= 8 && x.probability * x.impact < 15).length

  return (
    <>
      <PageHead
        title="Register rizík"
        sub="Riziká projektu s pravdepodobnosťou, dopadom a opatreniami. Skóre = pravdepodobnosť × dopad (1 – 25)."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => add('risks', { id: uid('risk'), category: 'Iné', title: 'Nové riziko', probability: 3, impact: 3, mitigation: '', owner: '', status: 'open' })}>
            Nové riziko
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Vysoké" value={high} tone={high > 0 ? 'crit' : 'neutral'} />
            <Stat label="Stredné" value={mid} tone={mid > 0 ? 'warn' : 'neutral'} />
            <Stat label="Otvorené" value={open.length} />
          </div>
          <Card title="Matica rizík" hint="Počet otvorených rizík v každom poli">
            <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-center text-[12.5px]">
              <div />
              {LEVELS.map((i) => (
                <div key={i} className="pb-0.5 text-muted">{i}</div>
              ))}
              {[...LEVELS].reverse().map((p) => [
                <div key={`l${p}`} className="flex items-center pr-1.5 text-muted">{p}</div>,
                ...LEVELS.map((i) => {
                  const items = open.filter((x) => x.probability === p && x.impact === i)
                  return (
                    <div
                      key={`${p}_${i}`}
                      className="flex aspect-square items-center justify-center rounded-md font-semibold tabular-nums"
                      style={{ background: cellBg[riskTone(p * i)] }}
                      title={items.length ? items.map((x) => x.title).join('\n') : `Pravdepodobnosť ${p}, dopad ${i}`}
                    >
                      {items.length || ''}
                    </div>
                  )
                }),
              ])}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted">
              <span>↑ pravdepodobnosť</span>
              <span>dopad →</span>
            </div>
          </Card>
        </div>

        <Card pad={false}>
          <ul className="m-0 list-none p-0">
            {sorted.map((x) => (
              <li key={x.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-line px-3 py-2.5 last:border-0 sm:px-4" style={x.status === 'closed' ? { opacity: 0.55 } : undefined}>
                <div className="pt-1"><Badge tone={riskTone(x.probability * x.impact)} title="Pravdepodobnosť × dopad">{x.probability * x.impact}</Badge></div>
                <div className="min-w-0">
                  <div className="font-medium"><AutoText value={x.title} onChange={(v) => patch('risks', x.id, { title: v })} ariaLabel="Názov rizika" perRow={80} /></div>
                  <div className="text-[13px] text-ink-2"><AutoText value={x.mitigation} onChange={(v) => patch('risks', x.id, { mitigation: v })} placeholder="Opatrenie" ariaLabel="Opatrenie" perRow={95} /></div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                    <label className="flex items-center gap-1">Oblasť <span className="w-28"><TextInput cell value={x.category} onChange={(v) => patch('risks', x.id, { category: v })} ariaLabel="Oblasť" /></span></label>
                    <label className="flex items-center gap-1">Pravdepodobnosť <span className="w-14"><Select cell value={String(x.probability)} onChange={(v) => patch('risks', x.id, { probability: Number(v) })} options={LEVEL_OPTS} ariaLabel="Pravdepodobnosť" /></span></label>
                    <label className="flex items-center gap-1">Dopad <span className="w-14"><Select cell value={String(x.impact)} onChange={(v) => patch('risks', x.id, { impact: Number(v) })} options={LEVEL_OPTS} ariaLabel="Dopad" /></span></label>
                    <label className="flex items-center gap-1">Zodpovedá <span className="w-32"><TextInput cell value={x.owner} onChange={(v) => patch('risks', x.id, { owner: v })} placeholder="meno" ariaLabel="Zodpovedná osoba" /></span></label>
                    <label className="flex items-center gap-1">Stav <span className="w-28"><Select cell value={x.status} onChange={(v: RiskStatus) => patch('risks', x.id, { status: v })} ariaLabel="Stav" options={Object.entries(RISK_STATUS).map(([value, label]) => ({ value: value as RiskStatus, label }))} /></span></label>
                    <span className="ml-auto"><IconButton title="Odstrániť riziko" tone="crit" onClick={() => remove('risks', x.id)}><Trash2 size={15} /></IconButton></span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
