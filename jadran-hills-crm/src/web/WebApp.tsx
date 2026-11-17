// Web s vlastným prihlásením: kto je prihlásený, či je členom projektu a s akým
// oprávnením – a až potom aplikácia nad databázou Supabase.

import { Inbox } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SharedApp, Splash, type Connection } from '../AppShell'
import { useAssistant } from '../assistantContext'
import { ExtensionsContext, type Account, type Extensions, type Role } from '../extensions'
import { setMediaBackend } from '../lib/media'
import { resetWelcomed } from '../lib/prefs'
import { Button } from '../ui/kit'
import { AccessCards } from './Access'
import { AuthScreen, AuthWait, NewPassword, NoAccess } from './Auth'
import { DocsDb } from './docs'
import Inquiries from './Inquiries'
import { forgetMediaUrls, MediaStore } from './media'
import { configured, supabase, supabaseDocs } from './supabase'

/** Adresa verejnej stránky projektu – o priečinok vyššie než CRM. */
const SITE_HREF = '../'

interface User {
  id: string
  email: string
  name: string
}

interface Member {
  role: Role
  name: string
  email: string
}

/** Členstvo zistené pre konkrétny účet; `value: null` = účet nie je členom. */
interface Membership {
  userId: string
  value: Member | null
  failed: boolean
}

function useUser(): { user: User | null | undefined; recovery: boolean; endRecovery(): void } {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    let alive = true
    const apply = (next: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!alive) return
      // Obnova prístupového tokenu ani návrat na kartu nemenia, kto je prihlásený.
      setUser((prev) => {
        if (prev !== undefined && (prev?.id ?? null) === (next?.id ?? null)) return prev
        return next ? { id: next.id, email: next.email ?? '', name: String(next.user_metadata?.name ?? '') } : null
      })
    }
    void supabase.auth.getSession().then(
      ({ data }) => apply(data.session?.user ?? null),
      () => apply(null),
    )
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      apply(session?.user ?? null)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const endRecovery = useCallback(() => setRecovery(false), [])
  return { user, recovery, endRecovery }
}

function useMembership(user: User | null | undefined): { membership: Membership | null; recheck(): void } {
  const [membership, setMembership] = useState<Membership | null>(null)
  const [tick, setTick] = useState(0)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) return
    let alive = true
    let failures = 0
    const check = async () => {
      const { data, error } = await supabase.from('crm_members').select('email, role, name').eq('user_id', userId).maybeSingle()
      if (!alive) return
      if (error) {
        failures += 1
        // Krátky výpadok spojenia nemá prihláseného vyhodiť z rozrobenej práce.
        if (failures >= 3) setMembership((m) => (m?.userId === userId && m.value ? m : { userId, value: null, failed: true }))
        return
      }
      failures = 0
      const value = (data as Member | null) ?? null
      setMembership((m) => (m?.userId === userId && !m.failed && m.value?.role === value?.role && m.value?.name === value?.name ? m : { userId, value, failed: false }))
    }
    void check()
    // Zmenu oprávnenia alebo odobratie prístupu zachytí pravidelná kontrola.
    const t = window.setInterval(() => void check(), 90_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, tick])

  const recheck = useCallback(() => setTick((t) => t + 1), [])
  return { membership: membership && membership.userId === userId ? membership : null, recheck }
}

/** Počet nevybavených dopytov z verejnej stránky – pre značku v menu. */
function useInquiryCount(active: boolean): { count: number; refresh(): void } {
  const [count, setCount] = useState(0)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    let alive = true
    const load = async () => {
      // Počet sa číta bežnou požiadavkou s jedným riadkom – niektoré siete požiadavky bez tela zdržiavajú.
      const { count: n, error } = await supabase.from('inquiries').select('id', { count: 'exact' }).eq('handled', false).limit(1)
      if (alive && !error) setCount(n ?? 0)
    }
    void load()
    const t = window.setInterval(() => void load(), 180_000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [active, tick])
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { count: active ? count : 0, refresh }
}

export default function WebApp() {
  const assistant = useAssistant()
  const { user, recovery, endRecovery } = useUser()
  const { membership, recheck } = useMembership(user)
  const [fresh, setFresh] = useState(false)
  const member = membership?.value ?? null
  const role = member?.role ?? null
  const inquiries = useInquiryCount(member !== null)

  const { identify, stop, prime } = assistant
  const signedName = member?.name || user?.name || ''
  useEffect(() => {
    identify(signedName)
  }, [identify, signedName])

  const signOut = useCallback(() => {
    stop()
    resetWelcomed()
    forgetMediaUrls()
    setMediaBackend(null)
    setFresh(false)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    void supabase.auth.signOut({ scope: 'local' })
  }, [stop])

  const connect = useCallback(async (): Promise<Connection | null> => {
    if (!role) return null
    const media = new MediaStore(supabase, () => role !== 'viewer')
    setMediaBackend(media)
    // Adresy obrázkov sa pripravia popri načítaní dát, aby titulný obrázok nechýbal na uvítaní.
    void supabase
      .from('crm_docs')
      .select('body')
      .eq('part', 'media')
      .maybeSingle()
      .then(({ data }) => {
        const items = ((data?.body as { items?: { assetId?: string | null }[] } | undefined)?.items ?? []) as { assetId?: string | null }[]
        return media.prime(items.map((i) => i.assetId).filter((p): p is string => typeof p === 'string' && p !== ''))
      })
      .then(undefined, () => {})
    return { db: new DocsDb(supabaseDocs(supabase)), readOnly: role === 'viewer' }
  }, [role])

  const account = useMemo<Account | null>(
    () => (member && user ? { name: member.name || user.name, email: member.email || user.email, role: member.role, signOut } : null),
    [member, user, signOut],
  )

  const ext = useMemo<Extensions>(
    () =>
      account
        ? {
            account,
            siteHref: SITE_HREF,
            settings: <AccessCards account={account} />,
            pages: [{ id: 'dopyty', label: 'Dopyty z webu', icon: Inbox, group: 'Predaj', page: <Inquiries onChanged={inquiries.refresh} />, badge: inquiries.count }],
          }
        : {},
    [account, inquiries.count, inquiries.refresh],
  )

  if (!configured) {
    return <Splash title="Web nie je nastavený" text="Pri zostavení stránky chýbala adresa a verejný kľúč projektu Supabase (súbor .env.web)." />
  }
  if (user === undefined) return <AuthWait text="Otváram…" />
  if (user && recovery) return <NewPassword onDone={endRecovery} onCancel={signOut} />
  if (!user) {
    return (
      <AuthScreen
        siteHref={SITE_HREF}
        onAttempt={prime}
        onSignedIn={() => {
          resetWelcomed()
          setFresh(true)
        }}
      />
    )
  }
  if (!membership) return <AuthWait text="Overujem prístup…" />
  if (membership.failed) {
    return (
      <Splash
        title="Prístup sa nepodarilo overiť"
        text="Server neodpovedá. Skontrolujte pripojenie a skúste to znova."
        action={
          <>
            <Button variant="primary" onClick={recheck}>Skúsiť znova</Button>
            <Button onClick={signOut}>Odhlásiť sa</Button>
          </>
        }
      />
    )
  }
  if (!member || !role) return <NoAccess email={user.email} siteHref={SITE_HREF} onRedeemed={recheck} onSignOut={signOut} />

  return (
    <ExtensionsContext.Provider value={ext}>
      <SharedApp key={`${user.id}:${role}`} connect={connect} autoEnter={fresh} failedAction={<Button onClick={signOut}>Odhlásiť sa</Button>} />
    </ExtensionsContext.Provider>
  )
}
