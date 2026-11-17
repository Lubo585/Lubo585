// Dopyty z verejnej stránky projektu. Formulár na webe ich ukladá do databázy;
// tu sa z nich jedným kliknutím stávajú klienti v obchodnej časti.

import { Check as CheckIcon, Mail, Phone, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { fmtDate, todayIso, uid } from '../lib/format'
import { useStore } from '../store'
import { Badge, Button, Empty, IconButton, Modal, Note, PageHead, Tabs } from '../ui/kit'
import { supabase } from './supabase'

export interface Inquiry {
  id: string
  created_at: string
  name: string
  email: string
  phone: string
  message: string
  interest: string
  handled: boolean
  /** Jazyk stránky, z ktorej dopyt prišiel. */
  lang: string
}

/** V akej reči návštevník stránku čítal – a teda v akej mu zrejme treba odpovedať. */
const PAGE_LANGUAGE: Record<string, string> = {
  sk: 'Slovenčina',
  en: 'Angličtina',
  hr: 'Chorvátčina',
  de: 'Nemčina',
  hu: 'Maďarčina',
}

type Filter = 'new' | 'done'

export default function Inquiries({ onChanged }: { onChanged(): void }) {
  const { data, add, sync } = useStore()
  const [rows, setRows] = useState<Inquiry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<Filter>('new')
  const [drop, setDrop] = useState<Inquiry | null>(null)
  const readOnly = sync.state === 'readonly'

  const load = useCallback(async () => {
    const { data: found, error } = await supabase
      .from('inquiries')
      .select('id, created_at, name, email, phone, message, interest, handled, lang')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      setFailed(true)
      return
    }
    setFailed(false)
    setRows(found as Inquiry[])
  }, [])

  useEffect(() => {
    let alive = true
    void Promise.resolve().then(() => {
      if (alive) void load()
    })
    const t = window.setInterval(() => void load(), 120_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [load])

  const setHandled = async (q: Inquiry, handled: boolean) => {
    setRows((r) => r?.map((x) => (x.id === q.id ? { ...x, handled } : x)) ?? r)
    const { error } = await supabase.from('inquiries').update({ handled }).eq('id', q.id)
    if (error) await load()
    onChanged()
  }

  const toClient = (q: Inquiry) => {
    add('clients', {
      id: uid('cl'),
      name: q.name,
      email: q.email,
      phone: q.phone,
      country: '',
      language: PAGE_LANGUAGE[q.lang] ?? '',
      source: 'Web projektu',
      agent: '',
      budget: 0,
      unitIds: [],
      stage: 'new',
      nextDate: todayIso(),
      nextAction: 'Odpovedať na dopyt z webu',
      note: [q.interest && `Záujem: ${q.interest}`, q.message].filter(Boolean).join('\n'),
      createdAt: todayIso(),
    })
    void setHandled(q, true)
  }

  const remove = async () => {
    if (!drop) return
    const id = drop.id
    setDrop(null)
    setRows((r) => r?.filter((x) => x.id !== id) ?? r)
    const { error } = await supabase.from('inquiries').delete().eq('id', id)
    if (error) await load()
    onChanged()
  }

  const fresh = rows?.filter((q) => !q.handled) ?? []
  const done = rows?.filter((q) => q.handled) ?? []
  const shown = filter === 'new' ? fresh : done
  const known = new Set(data.clients.map((c) => c.email.trim().toLowerCase()).filter(Boolean))

  return (
    <>
      <PageHead title="Dopyty z webu" sub="Správy z kontaktného formulára na prezentačnej stránke projektu. Z dopytu spravíte klienta jedným kliknutím." />

      {failed && (
        <div>
          <Note tone="warn">Dopyty sa nepodarilo načítať. Obnovte stránku.</Note>
        </div>
      )}

      <div>
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'new', label: `Nové (${fresh.length})` },
            { id: 'done', label: `Vybavené (${done.length})` },
          ]}
        />
      </div>

      {rows === null && !failed ? (
        <div className="mt-4 grid gap-3">
          <div className="skeleton h-28 rounded-xl" />
          <div className="skeleton h-28 rounded-xl" />
        </div>
      ) : shown.length === 0 ? (
        <Empty
          title={filter === 'new' ? 'Žiadne nové dopyty' : 'Zatiaľ nič vybavené'}
          text={filter === 'new' ? 'Keď niekto vyplní formulár na prezentačnej stránke, dopyt sa objaví tu.' : 'Vybavené dopyty ostávajú v zozname, kým ich neodstránite.'}
        />
      ) : (
        <div key={filter} className="mt-4 grid gap-3">
          {shown.map((q) => {
            const exists = known.has(q.email.trim().toLowerCase())
            return (
              <article key={q.id} className="rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 truncate text-[16px] font-semibold tracking-[-0.015em]">{q.name}</h2>
                      {q.interest && <Badge tone="accent">{q.interest}</Badge>}
                      {q.lang !== 'sk' && PAGE_LANGUAGE[q.lang] && <Badge title="Jazyk stránky, z ktorej dopyt prišiel">{PAGE_LANGUAGE[q.lang]}</Badge>}
                      {exists && <Badge tone="good">V klientoch</Badge>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                      <a href={`mailto:${q.email}`} className="inline-flex items-center gap-1.5"><Mail size={13} aria-hidden /> {q.email}</a>
                      {q.phone && <a href={`tel:${q.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5"><Phone size={13} aria-hidden /> {q.phone}</a>}
                    </div>
                  </div>
                  <time className="shrink-0 text-[12.5px] text-muted" dateTime={q.created_at}>
                    {fmtDate(q.created_at.slice(0, 10))} · {new Date(q.created_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                {q.message && <p className="mb-0 mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{q.message}</p>}
                {!readOnly && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!exists && <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => toClient(q)}>Vytvoriť klienta</Button>}
                    {q.handled ? (
                      <Button size="sm" onClick={() => void setHandled(q, false)}>Vrátiť medzi nové</Button>
                    ) : (
                      <Button size="sm" icon={<CheckIcon size={14} />} onClick={() => void setHandled(q, true)}>Vybavené</Button>
                    )}
                    <span className="ml-auto">
                      <IconButton onClick={() => setDrop(q)} title="Odstrániť dopyt" tone="crit"><Trash2 size={15} /></IconButton>
                    </span>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {drop && (
        <Modal
          title="Odstrániť dopyt?"
          onClose={() => setDrop(null)}
          footer={
            <>
              <Button onClick={() => setDrop(null)}>Zrušiť</Button>
              <Button variant="primary" onClick={() => void remove()}>Odstrániť</Button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] text-ink-2">Dopyt od „{drop.name}“ sa natrvalo odstráni vrátane kontaktných údajov. Klient vytvorený z dopytu ostáva.</p>
        </Modal>
      )}
    </>
  )
}
