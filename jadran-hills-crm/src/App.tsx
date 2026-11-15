import {
  Building2,
  CalendarRange,
  ChartLine,
  FileCheck,
  Handshake,
  House,
  LayoutDashboard,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  Ruler,
  Settings as SettingsIcon,
  ShieldAlert,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PRIVATE_PARAMS } from './data/seed'
import { createProject } from './data/templates'
import { todayIso } from './lib/format'
import { capability, hosted } from './lib/platform'
import { RemoteStore, type Db, type SyncState } from './lib/remote'
import Boq from './modules/Boq'
import Clients from './modules/Clients'
import Dashboard from './modules/Dashboard'
import Economics from './modules/Economics'
import Onboarding from './modules/Onboarding'
import Permits from './modules/Permits'
import ProjectCard from './modules/ProjectCard'
import Risks from './modules/Risks'
import Schedule from './modules/Schedule'
import SettingsPage from './modules/Settings'
import Tasks from './modules/Tasks'
import Tenders from './modules/Tenders'
import Units from './modules/Units'
import { localStore } from './lib/storage'
import { useStore } from './store'
import { StoreProvider } from './StoreProvider'
import type { ProjectData } from './types'
import { cx } from './ui/cx'

interface Route {
  id: string
  label: string
  icon: LucideIcon
  group: string
}

const ROUTES: Route[] = [
  { id: 'prehlad', label: 'Prehľad', icon: LayoutDashboard, group: 'Projekt' },
  { id: 'projekt', label: 'Karta projektu', icon: Building2, group: 'Projekt' },
  { id: 'ekonomika', label: 'Ekonomika', icon: ChartLine, group: 'Financie' },
  { id: 'vykaz', label: 'Výkaz výmer', icon: Ruler, group: 'Financie' },
  { id: 'jednotky', label: 'Jednotky a cenník', icon: House, group: 'Predaj' },
  { id: 'klienti', label: 'Klienti a obchod', icon: Users, group: 'Predaj' },
  { id: 'harmonogram', label: 'Harmonogram', icon: CalendarRange, group: 'Realizácia' },
  { id: 'tendre', label: 'Dodávatelia a tendre', icon: Handshake, group: 'Realizácia' },
  { id: 'povolenia', label: 'Povolenia a dokumenty', icon: FileCheck, group: 'Realizácia' },
  { id: 'rizika', label: 'Riziká', icon: ShieldAlert, group: 'Riadenie' },
  { id: 'ulohy', label: 'Úlohy', icon: ListChecks, group: 'Riadenie' },
  { id: 'nastavenia', label: 'Nastavenia a dáta', icon: SettingsIcon, group: 'Riadenie' },
]

function useHashRoute(): string {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '')
    return ROUTES.some((r) => r.id === h) ? h : 'prehlad'
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

type Theme = 'auto' | 'light' | 'dark'

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = document.documentElement.getAttribute('data-theme')
    return t === 'light' || t === 'dark' ? t : 'auto'
  })
  const cycle = () => {
    const next: Theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
    setTheme(next)
    if (next === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
    try {
      if (next === 'auto') localStorage.removeItem('jhcrm:theme')
      else localStorage.setItem('jhcrm:theme', next)
    } catch {
      /* téma sa len neuloží */
    }
  }
  return [theme, cycle]
}

function Nav({ route, onNavigate }: { route: string; onNavigate?: () => void }) {
  const groups = [...new Set(ROUTES.map((r) => r.group))]
  return (
    <nav aria-label="Hlavná navigácia" className="grid gap-4">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1 px-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{g}</div>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <li key={r.id}>
                <a
                  href={`#${r.id}`}
                  onClick={onNavigate}
                  aria-current={route === r.id ? 'page' : undefined}
                  className={cx(
                    'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] no-underline transition-colors',
                    route === r.id ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  <r.icon size={16} aria-hidden />
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

const SYNC_TEXT: Record<'local' | 'shared', Record<SyncState, string>> = {
  local: {
    saved: 'Zmeny sa ukladajú v tomto prehliadači',
    saving: 'Ukladá sa…',
    error: 'Ukladanie nie je dostupné',
    readonly: 'Len na čítanie',
  },
  shared: {
    saved: 'Všetky zmeny sú uložené',
    saving: 'Ukladá sa…',
    error: 'Zmeny sa nepodarilo uložiť',
    readonly: 'Len na čítanie',
  },
}

function Shell({ onReplace }: { onReplace: (d: ProjectData | null) => void }) {
  const route = useHashRoute()
  const { data, sync } = useStore()
  const [open, setOpen] = useState(false)
  const [theme, cycleTheme] = useTheme()
  const ThemeIcon = theme === 'auto' ? Monitor : theme === 'light' ? Sun : Moon
  const themeTitle = theme === 'auto' ? 'Téma: podľa systému' : theme === 'light' ? 'Téma: svetlá' : 'Téma: tmavá'
  const syncText = SYNC_TEXT[sync.shared ? 'shared' : 'local'][sync.state]

  useEffect(() => {
    document.title = `${data.project.name} CRM`
  }, [data.project.name])

  const pages: Record<string, ReactNode> = {
    prehlad: <Dashboard />,
    projekt: <ProjectCard />,
    ekonomika: <Economics />,
    vykaz: <Boq />,
    jednotky: <Units />,
    klienti: <Clients />,
    harmonogram: <Schedule />,
    tendre: <Tenders />,
    povolenia: <Permits />,
    rizika: <Risks />,
    ulohy: <Tasks />,
    nastavenia: <SettingsPage onReplace={onReplace} />,
  }

  const brand = (
    <a href="#prehlad" className="block px-2.5 no-underline" onClick={() => setOpen(false)}>
      <div className="truncate text-[15px] font-semibold tracking-tight text-ink">{data.project.name}</div>
      <div className="truncate text-[12px] text-muted">{data.project.subtitle}</div>
    </a>
  )

  // Tému na hostovanej stránke určuje hostiteľ; vlastný prepínač má len samostatná aplikácia.
  const themeButton = (size: number) =>
    hosted ? null : (
      <button type="button" onClick={cycleTheme} title={themeTitle} aria-label={themeTitle} className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2">
        <ThemeIcon size={size} />
      </button>
    )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Bočný panel – veľké obrazovky */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
        {brand}
        <Nav route={route} />
        <div className="mt-auto flex items-center justify-between gap-2 px-2.5 text-[12px] text-muted">
          <span aria-live="polite">{syncText}</span>
          {themeButton(16)}
        </div>
      </aside>

      {/* Horná lišta – mobil */}
      <header className="topbar no-print sticky z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface lg:hidden">
        <div className="min-w-0">{brand}</div>
        <div className="flex items-center gap-1">
          {themeButton(17)}
          <button type="button" onClick={() => setOpen(true)} aria-label="Otvoriť menu" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink hover:bg-surface-2">
            <Menu size={19} />
          </button>
        </div>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="drawer absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col gap-4 overflow-y-auto bg-surface px-3 shadow-2xl">
            <div className="flex items-center justify-between px-2.5">
              <span className="text-[13px] font-semibold text-muted">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zavrieť menu" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-surface-2">
                <X size={17} />
              </button>
            </div>
            <Nav route={route} onNavigate={() => setOpen(false)} />
            <div className="mt-auto px-2.5 text-[12px] text-muted">{syncText}</div>
          </div>
        </div>
      )}

      <main className="gutter print-full mx-auto w-full max-w-[1320px] py-5 lg:py-7">
        {sync.state === 'error' && (
          <div className="no-print mb-4 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn-ink" role="status">
            {sync.shared
              ? 'Posledné zmeny sa nepodarilo uložiť do databázy stránky. Skúsim to znova pri ďalšej úprave; ak to pretrváva, exportujte si dáta v časti Nastavenia a dáta.'
              : 'Prehliadač neumožnil uložiť dáta (súkromné okno alebo plné úložisko). Zmeny si zálohujte exportom v časti Nastavenia a dáta.'}
          </div>
        )}
        {sync.state === 'readonly' && (
          <div className="no-print mb-4 rounded-lg bg-accent-soft px-3.5 py-2.5 text-[13px] text-ink" role="status">
            Projekt máte sprístupnený len na čítanie. Úpravy, ktoré tu urobíte, sa neuložia a po obnovení stránky zmiznú.
          </div>
        )}
        {pages[route]}
      </main>
    </div>
  )
}

/** Úvodná obrazovka počas pripájania k databáze stránky. */
function Splash({ title, text }: { title: string; text: string }) {
  return (
    <main className="gutter mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
      <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
        <h1 className="m-0 text-[18px] font-semibold tracking-tight">{title}</h1>
        <p className="mb-0 mt-2 text-[13.5px] leading-relaxed text-ink-2" role="status">{text}</p>
      </div>
    </main>
  )
}

/** Samostatná aplikácia: dáta v úložisku prehliadača. */
function LocalApp() {
  const [initial, setInitial] = useState<ProjectData | null>(
    () => localStore.load() ?? (PRIVATE_PARAMS ? createProject(PRIVATE_PARAMS, todayIso()) : null),
  )
  const [generation, setGeneration] = useState(0)

  const replace = useCallback((d: ProjectData | null) => {
    if (d) localStore.save(d)
    else localStore.clear()
    setInitial(d)
    setGeneration((g) => g + 1)
    window.location.hash = 'prehlad'
  }, [])

  if (!initial) return <Onboarding onStart={replace} />
  return (
    <StoreProvider key={generation} initial={initial}>
      <Shell onReplace={replace} />
    </StoreProvider>
  )
}

type Boot =
  | { phase: 'connecting' }
  | { phase: 'loading'; slow: boolean }
  | { phase: 'local' }
  | { phase: 'empty' }
  | { phase: 'ready' }
  | { phase: 'failed' }

interface HostUser {
  can(name: string): Promise<boolean | null>
}

/** Hostovaná stránka: dáta v spoločnej databáze, prístup riadi prihlásenie hostiteľa. */
function HostedApp() {
  const [boot, setBoot] = useState<Boot>({ phase: 'connecting' })
  const [initial, setInitial] = useState<ProjectData | null>(null)
  const [generation, setGeneration] = useState(0)
  const [readOnly, setReadOnly] = useState(false)
  const [remote, setRemote] = useState<RemoteStore | null>(null)

  useEffect(() => {
    let alive = true
    let stop: (() => void) | null = null
    // Databáza nemusí odpovedať hneď; po 10 s to povieme, ale počúvame ďalej.
    const slow = window.setTimeout(() => {
      if (alive) setBoot((b) => (b.phase === 'connecting' || b.phase === 'loading' ? { phase: 'loading', slow: true } : b))
    }, 10_000)

    void (async () => {
      const db = await capability<Db>('db')
      if (!alive) return
      if (!db) {
        window.clearTimeout(slow)
        setBoot({ phase: 'local' })
        return
      }
      const user = await capability<HostUser>('user')
      const canWrite = user ? await user.can('data.write').catch(() => null) : null
      if (!alive) return
      if (canWrite === false) setReadOnly(true)

      const store = new RemoteStore(db)
      setRemote(store)
      setBoot((b) => (b.phase === 'connecting' ? { phase: 'loading', slow: false } : b))
      stop = store.start({
        onLoaded: (data) => {
          window.clearTimeout(slow)
          if (!alive) return
          setInitial(data)
          setBoot({ phase: data ? 'ready' : 'empty' })
        },
        onError: () => {
          window.clearTimeout(slow)
          if (alive) setBoot((b) => (b.phase === 'ready' ? b : { phase: 'failed' }))
        },
      })
    })()

    return () => {
      alive = false
      window.clearTimeout(slow)
      stop?.()
    }
  }, [])

  const replace = useCallback(
    (d: ProjectData | null) => {
      if (!d) return
      remote?.adopt()
      setInitial(d)
      setGeneration((g) => g + 1)
      setBoot({ phase: 'ready' })
      window.location.hash = 'prehlad'
    },
    [remote],
  )

  if (boot.phase === 'local') return <LocalApp />
  if (boot.phase === 'connecting' || boot.phase === 'loading') {
    return (
      <Splash
        title="Načítavam dáta projektu"
        text={
          boot.phase === 'loading' && boot.slow
            ? 'Databáza stránky zatiaľ neodpovedá. Skúšam to ďalej – ak sa nič nezmení, skontrolujte pripojenie.'
            : 'Pripájam sa k databáze tejto stránky. Zobrazí sa prehľad projektu, ekonomika, výkaz výmer a ostatné moduly.'
        }
      />
    )
  }
  if (boot.phase === 'failed') {
    return <Splash title="Dáta sa nepodarilo načítať" text="Databáza tejto stránky nie je pre toto zobrazenie dostupná. Otvorte stránku znova; ak problém pretrváva, overte si u vlastníka, či k nej máte prístup." />
  }
  if (boot.phase === 'empty' || !initial) {
    return readOnly ? (
      <Splash title="Projekt zatiaľ nemá dáta" text="V databáze tejto stránky ešte nie sú dáta projektu a váš prístup je len na čítanie. Dáta musí nahrať vlastník stránky." />
    ) : (
      <Onboarding onStart={replace} shared />
    )
  }
  return (
    <StoreProvider key={generation} initial={initial} remote={remote} readOnly={readOnly}>
      <Shell onReplace={replace} />
    </StoreProvider>
  )
}

export default function App() {
  return hosted ? <HostedApp /> : <LocalApp />
}
