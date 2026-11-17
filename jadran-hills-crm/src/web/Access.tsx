// Nastavenia na webe s vlastným prihlásením: môj účet a správa prístupov.
// Prístupy spravuje vlastník: pozve človeka kódom, zmení mu oprávnenie alebo ho odoberie.

import { Check as CheckIcon, Copy, KeyRound, LogOut, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ROLE_LABEL, type Account, type Role } from '../extensions'
import { fmtDate } from '../lib/format'
import { Badge, Button, Card, Field, IconButton, Modal, Note, Select, TextInput } from '../ui/kit'
import { inviteMessage, MIN_PASSWORD } from './access'
import { supabase } from './supabase'

interface MemberRow {
  email: string
  role: Role
  name: string
  user_id: string | null
  added_at: string
}

interface InviteRow {
  id: string
  email: string
  role: Role
  name: string
  expires_at: string
  used_at: string | null
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'editor', label: 'Môže upravovať' },
  { value: 'viewer', label: 'Len na čítanie' },
  { value: 'owner', label: 'Vlastník (spravuje prístupy)' },
]

const INVITE_ERROR: Record<string, string> = {
  bad_email: 'Skontrolujte e-mailovú adresu.',
  self: 'Seba pozvať nemôžete – heslo si zmeníte v karte Môj účet.',
  too_many_invites: 'Čaká priveľa nevyužitých pozvánok. Niektoré najprv zrušte.',
  forbidden: 'Pozývať môže len vlastník projektu.',
}

function useCopy(): [boolean, (text: string) => void] {
  const [done, setDone] = useState(false)
  const copy = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setDone(true)
        window.setTimeout(() => setDone(false), 1800)
      },
      () => {},
    )
  }, [])
  return [done, copy]
}

// ───────────────────────── Môj účet ─────────────────────────

function MyAccount({ account }: { account: Account }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(`Heslo musí mať aspoň ${MIN_PASSWORD} znakov.`)
      return
    }
    setBusy(true)
    try {
      const { error: e } = await supabase.auth.updateUser({ password })
      if (e) setError(e.code === 'same_password' ? 'Nové heslo musí byť iné než doterajšie.' : 'Heslo sa nepodarilo zmeniť. Skúste to znova.')
      else {
        setSaved(true)
        setOpen(false)
        setPassword('')
      }
    } catch {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Môj účet">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em]">{account.name || 'Bez mena'}</div>
          <div className="truncate text-[13px] text-muted">{account.email}</div>
        </div>
        <Badge tone="accent">{ROLE_LABEL[account.role]}</Badge>
      </div>

      {open ? (
        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <Field label="Nové heslo" hint={`Aspoň ${MIN_PASSWORD} znakov. Ostatné zariadenia ostanú prihlásené, kým sa neodhlásia.`}>
            <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </Field>
          {error && <p className="m-0 text-[13px] text-crit-ink" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Ukladám…' : 'Uložiť heslo'}</Button>
            <Button onClick={() => { setOpen(false); setError(''); setPassword('') }}>Zrušiť</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={<KeyRound size={15} />} onClick={() => { setOpen(true); setSaved(false) }}>Zmeniť heslo</Button>
          <Button icon={<LogOut size={15} />} onClick={account.signOut}>Odhlásiť sa</Button>
        </div>
      )}
      {saved && <p className="mb-0 mt-3 text-[13px] text-good-ink" role="status">Heslo je zmenené.</p>}
      <p className="mb-0 mt-4 text-[12.5px] text-muted">
        Na spoločnom počítači sa po práci odhláste – prihlásenie inak ostáva v prehliadači uložené.
      </p>
    </Card>
  )
}

// ───────────────────────── Používatelia a prístupy ─────────────────────────

type Issued = { email: string; code: string } | null

function People({ account }: { account: Account }) {
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [failed, setFailed] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<Issued>(null)
  const [drop, setDrop] = useState<MemberRow | null>(null)
  const [copied, copy] = useCopy()

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      supabase.from('crm_members').select('email, role, name, user_id, added_at').order('added_at'),
      supabase.from('crm_invites').select('id, email, role, name, expires_at, used_at').is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at'),
    ])
    if (m.error || i.error) {
      setFailed(true)
      return
    }
    setFailed(false)
    setMembers(m.data as MemberRow[])
    setInvites(i.data as InviteRow[])
  }, [])

  useEffect(() => {
    let alive = true
    void Promise.resolve().then(() => {
      if (alive) void load()
    })
    return () => {
      alive = false
    }
  }, [load])

  const message = issued ? inviteMessage('Jadran Hills', `${window.location.origin}${window.location.pathname}`, issued.email, issued.code) : ''

  const onInvite = async (ev: FormEvent) => {
    ev.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data, error: e } = await supabase.rpc('crm_invite', { p_email: email.trim(), p_role: role, p_name: name.trim() })
      if (e || typeof data !== 'string') {
        const key = Object.keys(INVITE_ERROR).find((k) => e?.message.includes(k))
        setError(key ? INVITE_ERROR[key] : 'Pozvánku sa nepodarilo vytvoriť. Skúste to znova.')
        return
      }
      setIssued({ email: email.trim().toLowerCase(), code: data })
      setEmail('')
      setName('')
      await load()
    } catch {
      setError('Nepodarilo sa spojiť so serverom.')
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (m: MemberRow, next: Role) => {
    setError('')
    const { error: e } = await supabase.from('crm_members').update({ role: next }).eq('email', m.email)
    if (e) setError(e.message.includes('last_owner') ? 'Projekt musí mať aspoň jedného vlastníka.' : 'Oprávnenie sa nepodarilo zmeniť.')
    await load()
  }

  const remove = async () => {
    if (!drop) return
    setError('')
    const { error: e } = await supabase.from('crm_members').delete().eq('email', drop.email)
    if (e) setError(e.message.includes('last_owner') ? 'Projekt musí mať aspoň jedného vlastníka.' : 'Používateľa sa nepodarilo odobrať.')
    setDrop(null)
    await load()
  }

  const revoke = async (id: string) => {
    await supabase.from('crm_invites').delete().eq('id', id)
    await load()
  }

  return (
    <Card title="Používatelia a prístupy" hint="Do systému sa dostane len ten, koho pozvete.">
      {failed && <Note tone="warn">Zoznam sa nepodarilo načítať. Obnovte stránku.</Note>}

      {members && (
        <ul className="m-0 grid list-none gap-2 p-0">
          {members.map((m) => {
            const me = m.email === account.email
            return (
              <li key={m.email} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-ink">
                    {m.name || m.email}
                    {me && <span className="ml-1.5 font-normal text-muted">(vy)</span>}
                  </div>
                  <div className="truncate text-[12.5px] text-muted">{m.user_id ? m.email : `${m.email} · bez účtu, nemá prístup`}</div>
                </div>
                {me ? (
                  <Badge tone="accent">{ROLE_LABEL[m.role]}</Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="w-[190px] max-w-[52vw]">
                      <Select<Role> value={m.role} onChange={(v) => void changeRole(m, v)} options={ROLE_OPTIONS} ariaLabel={`Oprávnenie: ${m.name || m.email}`} />
                    </div>
                    <IconButton onClick={() => setDrop(m)} title={`Odobrať prístup: ${m.name || m.email}`} tone="crit"><Trash2 size={15} /></IconButton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {invites.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Čakajúce pozvánky</div>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-2 px-3.5 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] text-ink">{i.name ? `${i.name} · ${i.email}` : i.email}</div>
                  <div className="truncate text-[12.5px] text-muted">{ROLE_LABEL[i.role]} · platí do {fmtDate(i.expires_at.slice(0, 10))}</div>
                </div>
                <Button size="sm" onClick={() => void revoke(i.id)}>Zrušiť</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="mt-5 grid gap-3 border-t border-line pt-4" onSubmit={onInvite}>
        <div className="text-[14px] font-semibold tracking-[-0.01em]">Pozvať človeka</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-mail"><TextInput type="email" value={email} onChange={setEmail} placeholder="kolega@firma.sk" /></Field>
          <Field label="Meno"><TextInput value={name} onChange={setName} placeholder="nepovinné" /></Field>
        </div>
        <Field label="Oprávnenie">
          <Select<Role> value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </Field>
        {error && <p className="m-0 text-[13px] text-crit-ink" role="alert">{error}</p>}
        <div>
          <Button type="submit" variant="primary" icon={<UserPlus size={15} />} disabled={busy || email.trim() === ''}>{busy ? 'Vytváram…' : 'Vytvoriť pozvánku'}</Button>
        </div>
        <p className="m-0 text-[12.5px] text-muted">
          Vznikne jednorazový kód viazaný na tento e-mail. Pošlite ho pozvanému sami – systém e-maily neodosiela. Rovnako sa rieši zabudnuté heslo: nová pozvánka na ten istý e-mail.
        </p>
      </form>

      {issued && (
        <Modal
          title="Pozvánka je pripravená"
          onClose={() => setIssued(null)}
          footer={
            <>
              <Button onClick={() => setIssued(null)}>Hotovo</Button>
              <Button variant="primary" icon={copied ? <CheckIcon size={15} /> : <Copy size={15} />} onClick={() => copy(message)}>
                {copied ? 'Skopírované' : 'Skopírovať pozvánku'}
              </Button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] text-ink-2">
            Kód pre <strong className="font-semibold text-ink">{issued.email}</strong>. Zobrazí sa len teraz – skopírujte si ho a pošlite pozvanému.
          </p>
          <div className="code-box mt-3">{issued.code}</div>
          <pre className="mb-0 mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">{message}</pre>
        </Modal>
      )}

      {drop && (
        <Modal
          title="Odobrať prístup?"
          onClose={() => setDrop(null)}
          footer={
            <>
              <Button onClick={() => setDrop(null)}>Zrušiť</Button>
              <Button variant="primary" onClick={() => void remove()}>Odobrať</Button>
            </>
          }
        >
          <p className="m-0 text-[13.5px] text-ink-2">
            {drop.name || drop.email} stratí prístup k dátam projektu okamžite. Znova ho pridáte novou pozvánkou.
          </p>
        </Modal>
      )}
    </Card>
  )
}

/** Karty v časti Nastavenia. */
export function AccessCards({ account }: { account: Account }) {
  return (
    <>
      <MyAccount account={account} />
      {account.role === 'owner' ? (
        <People account={account} />
      ) : (
        <Card title="Používatelia a prístupy">
          <p className="m-0 text-[13.5px] text-ink-2">
            Prístupy spravuje vlastník projektu. Ak potrebujete iné oprávnenie alebo ste zabudli heslo, požiadajte ho o novú pozvánku.
          </p>
          <div className="mt-3">
            <Note tone="accent">
              Všetci pracujú nad tými istými dátami a zmeny vidia priebežne. Ak dvaja naraz upravia tú istú časť (napríklad výkaz výmer), platí neskorší zápis.
            </Note>
          </div>
        </Card>
      )}
    </>
  )
}
