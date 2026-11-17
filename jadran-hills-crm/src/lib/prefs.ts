// Osobné nastavenia uvítania a asistenta. Patria prehliadaču konkrétneho človeka,
// nie projektu – preto sú v miestnom úložisku a nie v spoločnej databáze.

export type GreetLang = 'auto' | 'sk' | 'en'
export type VoiceName = 'buttery' | 'airy' | 'glassy' | 'rounded'

export interface AssistantPrefs {
  /** Zobraziť uvítaciu obrazovku pri otvorení. */
  welcome: boolean
  /** Prehrať úvodnú zvučku. */
  sound: boolean
  /** Prečítať pozdrav hlasom. */
  voice: boolean
  /** Meno asistenta. */
  assistant: string
  /** Oslovenie používateľa; prázdne = meno z prihlásenia. */
  salutation: string
  lang: GreetLang
  voiceName: VoiceName
  /** Tempo reči, 0,8 až 1,3. */
  rate: number
}

export const DEFAULT_PREFS: AssistantPrefs = {
  welcome: true,
  sound: true,
  voice: true,
  assistant: 'Jarvis',
  salutation: '',
  lang: 'auto',
  voiceName: 'buttery',
  rate: 1,
}

const KEY = 'jhcrm:assistant:v1'
const SEEN = 'jhcrm:welcomed'

export function loadPrefs(): AssistantPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<AssistantPrefs>
    return { ...DEFAULT_PREFS, ...p, rate: Math.max(0.8, Math.min(1.3, Number(p.rate) || 1)) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(p: AssistantPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* nastavenie vydrží len do zatvorenia stránky */
  }
}

/** Uvítanie sa v jednom okne ukáže raz – obnovenie stránky ho neopakuje. */
export function welcomedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}

/** Po novom prihlásení sa uvítanie ukáže znova. */
export function resetWelcomed(): void {
  try {
    sessionStorage.removeItem(SEEN)
  } catch {
    /* bez úložiska sa uvítanie ukáže vždy */
  }
}

export function markWelcomed(): void {
  try {
    sessionStorage.setItem(SEEN, '1')
  } catch {
    /* bez úložiska sa uvítanie ukáže aj nabudúce */
  }
}
