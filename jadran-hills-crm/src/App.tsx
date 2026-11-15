import {
  AudioLines,
  Building2,
  CalendarRange,
  ChartLine,
  FileCheck,
  Handshake,
  House,
  Images,
  LayoutDashboard,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  Ruler,
  Settings as SettingsIcon,
  ShieldAlert,
  Square,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAssistant } from './assistantContext'
import { AssistantProvider } from './AssistantProvider'
import { PRIVATE_PARAMS } from './data/seed'
import { createProject } from './data/templates'
import { todayIso } from './lib/format'
import { capability, hosted } from './lib/platform'
import { markWelcomed, welcomedThisSession } from './lib/prefs'
import { RemoteStore, type Db, type SyncState } from './lib/remote'
import Boq from './modules/Boq'
import Clients from './modules/Clients'
import Dashboard from './modules/Dashboard'
import Economics from './modules/Economics'
import Gallery from './modules/Gallery'
import Onboarding from './modules/Onboarding'
import Permits from './modules/Permits'
import ProjectCard from './modules/ProjectCard'
import Risks from './modules/Risks'
import Schedule from './modules/Schedule'
import SettingsPage from './modules/Settings'
import Tasks from './modules/Tasks'
import Tenders from './modules/Tenders'
import Units from './modules/Units'
import Welcome, { type WelcomePhase } from './modules/Welcome'
import { localStore } from './lib/storage'
import { useStore } from './store'
import { StoreProvider } from './StoreProvider'
import type { ProjectData } from './types'
import { cx } from './ui/cx'
import { useMountTransition, useScrolled, useSlider } from './ui/motion'

interface Route {
  id: string
  label: string
  icon: LucideIcon
  group: string
}

const ROUTES: Route[] = [
  { id: 'prehlad', label: 'Prehľad', icon: LayoutDashboard, group: 'Projekt' },
  { id: 'projekt', label: 'Karta projektu', icon: Building2, group: 'Projekt' },
  { id: 'galeria', label: 'Galéria', icon: Images, group: 'Projekt' },
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
  const { box, pill } = useSlider<HTMLElement, HTMLSpanElement>(route)
  return (
    <nav ref={box} aria-label="Hlavná navigácia" className="relative grid gap-5">
      <span ref={pill} className="nav-pill" aria-hidden />
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{g}</div>
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {ROUTES.filter((r) => r.group === g).map((r) => (
              <li key={r.id}>
                <a
                  href={`#${r.id}`}
                  onClick={onNavigate}
                  data-on={route === r.id}
                  aria-current={route === r.id ? 'page' : undefined}
                  className={cx(
                    'relative z-[1] flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] no-underline transition-colors duration-300 hover:no-underline',
                    route === r.id ? 'font-semibold text-accent' : 'text-ink-2 hover:bg-tint hover:text-ink',
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

const SYNC_DOT: Record<SyncState, string> = {
  saved: 'bg-good',
  saving: 'bg-accent-fill animate-pulse',
  error: 'bg-warn',
  readonly: 'bg-muted',
}

function Shell({ onReplace }: { onReplace: (d: ProjectData | null) => void }) {
  const route = useHashRoute()
  const { data, sync } = useStore()
  const assistant = useAssistant()
  const [open, setOpen] = useState(false)
  const drawer = useMountTransition(open, 220)
  const scrolled = useScrolled(20)
  const [theme, cycleTheme] = useTheme()
  const ThemeIcon = theme === 'auto' ? Monitor : theme === 'light' ? Sun : Moon
  const themeTitle = theme === 'auto' ? 'Téma: podľa systému' : theme === 'light' ? 'Téma: svetlá' : 'Téma: tmavá'
  const syncText = SYNC_TEXT[sync.shared ? 'shared' : 'local'][sync.state]
  const title = ROUTES.find((r) => r.id === route)?.label ?? ''
  const who = assistant.prefs.assistant.trim() || 'Jarvis'

  useEffect(() => {
    document.title = `${data.project.name} CRM`
  }, [data.project.name])

  const pages: Record<string, ReactNode> = {
    prehlad: <Dashboard />,
    projekt: <ProjectCard />,
    galeria: <Gallery />,
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
    <a href="#prehlad" className="flex min-w-0 items-center gap-3 px-1 no-underline hover:no-underline" onClick={() => setOpen(false)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-fill text-accent-ink shadow-[0_4px_12px_color-mix(in_srgb,var(--accent-fill)_35%,transparent)]">
        <Building2 size={18} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold tracking-[-0.015em] text-ink">{data.project.name}</span>
        <span className="block truncate text-[12px] text-muted">{data.project.subtitle}</span>
      </span>
    </a>
  )

  const iconBtn = 'press inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-2 hover:bg-tint hover:text-ink'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      {/* Bočný panel – veľké obrazovky */}
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
        {brand}
        <Nav route={route} />
        <div className="mt-auto flex items-center gap-2 px-3 text-[12px] text-muted" aria-live="polite">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', SYNC_DOT[sync.state])} aria-hidden />
          {syncText}
        </div>
      </aside>

      <div className="min-w-0">
        {/* Horná lišta – po posunutí stránky zosklovatie a ukáže názov časti */}
        <header className="topbar gutter no-print sticky z-40 flex h-[52px] items-center gap-2" data-scrolled={scrolled}>
          <div className="min-w-0 flex-1">
            <div className="lg:hidden">{brand}</div>
            <div className="topbar-title hidden truncate text-[15px] font-semibold tracking-[-0.015em] lg:block">{title}</div>
          </div>
          <span className={cx('h-2 w-2 shrink-0 rounded-full lg:hidden', SYNC_DOT[sync.state])} title={syncText} role="img" aria-label={syncText} />
          <button
            type="button"
            onClick={() => (assistant.speaking ? assistant.stop() : assistant.greet(data, { chime: false }))}
            title={assistant.speaking ? 'Zastaviť asistenta' : `${who}: zhrnúť stav projektu`}
            aria-label={assistant.speaking ? 'Zastaviť asistenta' : `${who}: zhrnúť stav projektu`}
            className={cx(iconBtn, assistant.speaking && 'bg-accent-soft text-accent')}
          >
            {assistant.speaking ? <Square size={14} fill="currentColor" /> : <AudioLines size={18} />}
          </button>
          {/* Tému na hostovanej stránke určuje hostiteľ; vlastný prepínač má len samostatná aplikácia. */}
          {!hosted && (
            <button type="button" onClick={cycleTheme} title={themeTitle} aria-label={themeTitle} className={iconBtn}>
              <ThemeIcon size={17} />
            </button>
          )}
          <button type="button" onClick={() => setOpen(true)} aria-label="Otvoriť menu" className={cx(iconBtn, 'lg:hidden')}>
            <Menu size={19} />
          </button>
        </header>

        <main className="gutter print-full mx-auto w-full max-w-[1320px] pb-20 pt-2 lg:pt-3">
          {sync.state === 'error' && (
            <div className="no-print mb-4 rounded-xl bg-warn-soft px-4 py-3 text-[13px] text-warn-ink" role="status">
              {sync.shared
                ? 'Posledné zmeny sa nepodarilo uložiť do databázy stránky. Skúsim to znova pri ďalšej úprave; ak to pretrváva, exportujte si dáta v časti Nastavenia a dáta.'
                : 'Prehliadač neumožnil uložiť dáta (súkromné okno alebo plné úložisko). Zmeny si zálohujte exportom v časti Nastavenia a dáta.'}
            </div>
          )}
          {sync.state === 'readonly' && (
            <div className="no-print mb-4 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-ink" role="status">
              Projekt máte sprístupnený len na čítanie. Úpravy, ktoré tu urobíte, sa neuložia a po obnovení stránky zmiznú.
            </div>
          )}
          <div key={route} className="page">
            {pages[route]}
          </div>
        </main>
      </div>

      {drawer.mounted && (
        <div className="backdrop no-print fixed inset-0 z-50 lg:hidden" data-phase={drawer.phase} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[6px]" onClick={() => setOpen(false)} />
          <div className="drawer absolute inset-y-0 right-0 flex w-[288px] max-w-[85vw] flex-col gap-5 overflow-y-auto bg-surface px-3 shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between px-3">
              <span className="text-[13px] font-semibold text-muted">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zavrieť menu" className={iconBtn}>
                <X size={17} />
              </button>
            </div>
            <Nav route={route} onNavigate={() => setOpen(false)} />
            <div className="mt-auto flex items-center gap-2 px-3 text-[12px] text-muted">
              <span className={cx('h-2 w-2 shrink-0 rounded-full', SYNC_DOT[sync.state])} aria-hidden />
              {syncText}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── Uvítanie pri otvorení ─────────────────────────

type GatePhase = WelcomePhase | 'done'

/** Riadi uvítaciu obrazovku: zobrazí sa raz po otvorení a po vstupe plynulo odkryje aplikáciu. */
function useWelcomeGate(): { phase: GatePhase; enter(data: ProjectData, sound: boolean): void } {
  const assistant = useAssistant()
  const [phase, setPhase] = useState<GatePhase>(() => (assistant.prefs.welcome && !welcomedThisSession() ? 'idle' : 'done'))
  const enter = useCallback(
    (data: ProjectData, sound: boolean) => {
      markWelcomed()
      // Zvuk a hlas sa musia spustiť priamo z kliknutia, inak ich prehliadač nepovolí.
      if (sound) assistant.greet(data)
      const hold = sound ? 1700 : 650
      setPhase('entering')
      window.setTimeout(() => setPhase('leaving'), hold)
      window.setTimeout(() => setPhase('done'), hold + 1000)
    },
    [assistant],
  )
  return { phase, enter }
}

/** Aplikácia s uvítacou obrazovkou nad sebou; poradie prvkov sa nemení, aby sa aplikácia nenačítala dvakrát. */
function Stage({ gate, data, slow, children }: { gate: ReturnType<typeof useWelcomeGate>; data: ProjectData | null; slow?: boolean; children: ReactNode }) {
  const showApp = !!data && (gate.phase === 'leaving' || gate.phase === 'done')
  return (
    <>
      {showApp && (
        <div key="app" className={gate.phase === 'leaving' ? 'app-reveal' : undefined}>
          {children}
        </div>
      )}
      {gate.phase !== 'done' && <Welcome key="welcome" data={data} phase={gate.phase} slow={slow} onEnter={(sound) => data && gate.enter(data, sound)} />}
    </>
  )
}

/** Úvodná obrazovka počas pripájania k databáze stránky. */
function Splash({ title, text }: { title: string; text: string }) {
  return (
    <main className="gutter mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
      <div className="fade-in rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
        <h1 className="m-0 text-[20px] font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mb-0 mt-2 text-[14px] leading-relaxed text-ink-2" role="status">{text}</p>
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

  const gate = useWelcomeGate()

  if (!initial) return <Onboarding onStart={replace} />
  return (
    <Stage gate={gate} data={initial}>
      <StoreProvider key={generation} initial={initial}>
        <Shell onReplace={replace} />
      </StoreProvider>
    </Stage>
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
  const gate = useWelcomeGate()

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
      // Kým je na obrazovke uvítanie, aplikácia ešte nebeží; zmeny od ostatných sa preto
      // zapracujú do načítaných dát tu. Po vstupe ich preberá samotná aplikácia.
      store.attach({ onRemote: (merge) => setInitial((d) => (d ? merge(d) : d)), onState: () => {} })
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
  const waiting = boot.phase === 'connecting' || boot.phase === 'loading'
  if (waiting && gate.phase === 'done') {
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
  if (boot.phase === 'empty' || (!waiting && !initial)) {
    return readOnly ? (
      <Splash title="Projekt zatiaľ nemá dáta" text="V databáze tejto stránky ešte nie sú dáta projektu a váš prístup je len na čítanie. Dáta musí nahrať vlastník stránky." />
    ) : (
      <Onboarding onStart={replace} shared />
    )
  }
  return (
    <Stage gate={gate} data={waiting ? null : initial} slow={boot.phase === 'loading' && boot.slow}>
      {initial && (
        <StoreProvider key={generation} initial={initial} remote={remote} readOnly={readOnly}>
          <Shell onReplace={replace} />
        </StoreProvider>
      )}
    </Stage>
  )
}

export default function App() {
  return <AssistantProvider>{hosted ? <HostedApp /> : <LocalApp />}</AssistantProvider>
}
