// Spoločné úložisko projektu v databáze hostiteľa.
//
// Projekt je rozdelený na časti – jadro (údaje o projekte a nastavenia) a každú
// kolekciu zvlášť – a každá časť je jeden dokument. Zmena jednej ceny tak prepíše
// len jeden malý dokument a dvaja ľudia pracujúci v rôznych moduloch si navzájom
// neprepisujú prácu. V rámci jednej časti platí posledný zápis.

import type { CollectionKey, ProjectData } from '../types'
import { errorCode } from './platform'
import { COLLECTIONS, normalize } from './storage'

// ───────────────────────── Rozhranie databázy (len použitá časť) ─────────────────────────

export interface DocSnap {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
}

export interface QuerySnap {
  docs: DocSnap[]
  metadata: { fromCache: boolean; hasPendingWrites: boolean }
}

export interface Db {
  doc(path: string): { set(data: Record<string, unknown>): Promise<void> }
  collection(path: string): {
    onSnapshot(next: (snap: QuerySnap) => void, error?: (e: unknown) => void): () => void
  }
}

// ───────────────────────── Časti projektu ─────────────────────────

export const COLLECTION = 'crm'
export type Part = 'core' | CollectionKey
export const PARTS: Part[] = ['core', ...COLLECTIONS]

type Core = Pick<ProjectData, 'project' | 'settings'>

/** Hodnota časti: pri jadre dvojica objektov, pri kolekcii pole. */
function partOf(d: ProjectData, part: Part): unknown {
  return part === 'core' ? ({ project: d.project, settings: d.settings } satisfies Core) : d[part]
}

/** Zhoda podľa identity – modul pri každej úprave vytvára nové objekty. */
function sameRef(a: unknown, b: unknown, part: Part): boolean {
  if (part !== 'core') return a === b
  const x = a as Core | undefined
  const y = b as Core | undefined
  return !!x && !!y && x.project === y.project && x.settings === y.settings
}

/** Zhoda podľa obsahu, nezávisle od poradia kľúčov. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

/** Telo dokumentu pre danú časť. */
export function toDoc(d: ProjectData, part: Part): Record<string, unknown> {
  if (part === 'core') return { schema: d.schema, meta: d.meta, project: d.project, settings: d.settings }
  return { items: d[part] }
}

/** Zloží projekt z dokumentov; bez jadra projekt neexistuje. */
export function assemble(docs: Map<string, Record<string, unknown>>): ProjectData | null {
  const core = docs.get('core')
  if (!core) return null
  const raw: Record<string, unknown> = { ...core }
  for (const k of COLLECTIONS) raw[k] = docs.get(k)?.items
  return normalize(raw)
}

// ───────────────────────── Úložisko ─────────────────────────

export type SyncState = 'saved' | 'saving' | 'error' | 'readonly'

interface LoadHandlers {
  /** Prvé načítanie: projekt, alebo null, ak je databáza prázdna. */
  onLoaded(data: ProjectData | null): void
  onError(code: string): void
}

interface LiveHandlers {
  /** Zmena od iného používateľa: funkcia, ktorá ju zapracuje do miestneho stavu. */
  onRemote(merge: (local: ProjectData) => ProjectData): void
  onState(state: SyncState): void
}

export class RemoteStore {
  private readonly db: Db
  /** Hodnoty častí, o ktorých vieme, že sú v databáze. */
  private saved = new Map<Part, unknown>()
  /**
   * Hodnoty častí, ktoré aplikácia naposledy dostala (pri načítaní alebo prevzatím zmeny).
   * Časť, ktorú aplikácia drží v tejto podobe, sama nezmenila – taká sa nikdy nezapisuje,
   * aj keby sa databáza medzitým posunula ďalej.
   */
  private handed = new Map<Part, unknown>()
  private target: ProjectData | null = null
  private writing = false
  private loaded = false
  private retry: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private load: LoadHandlers | null = null
  private live: LiveHandlers | null = null
  private unsubscribe: (() => void) | null = null

  constructor(db: Db) {
    this.db = db
  }

  /** Prihlási sa na odber zmien. Volať raz; vráti funkciu na odhlásenie. */
  start(handlers: LoadHandlers): () => void {
    this.load = handlers
    this.unsubscribe = this.db.collection(COLLECTION).onSnapshot(
      (snap) => this.receive(snap),
      (e) => handlers.onError(errorCode(e)),
    )
    return () => {
      this.unsubscribe?.()
      this.unsubscribe = null
      if (this.retry) clearTimeout(this.retry)
    }
  }

  /** Pripojí bežiacu aplikáciu: zmeny od iných a stav ukladania. */
  attach(handlers: LiveHandlers): () => void {
    this.live = handlers
    // Čo prišlo z databázy, kým nikto nepočúval (napr. počas uvítacej obrazovky), dostane hneď.
    for (const part of PARTS) {
      if (this.saved.has(part) && !sameRef(this.saved.get(part), this.handed.get(part), part)) this.deliver(part)
    }
    return () => {
      if (this.live === handlers) this.live = null
    }
  }

  private receive(snap: QuerySnap): void {
    const docs = new Map<string, Record<string, unknown>>()
    for (const d of snap.docs) {
      const body = d.exists ? d.data() : undefined
      if (body) docs.set(d.id, body)
    }
    const incoming = assemble(docs)

    if (!this.loaded) {
      // Nepotvrdená kópia z minulej návštevy môže byť neúplná – čakáme na odpoveď databázy.
      if (snap.metadata.fromCache && !incoming) return
      this.loaded = true
      if (incoming) {
        for (const p of PARTS) {
          const value = partOf(incoming, p)
          this.saved.set(p, value)
          this.handed.set(p, value)
        }
      }
      this.load?.onLoaded(incoming)
      return
    }
    if (!incoming) return

    for (const part of PARTS) {
      if (!docs.has(part)) continue
      const before = this.saved.get(part)
      const value = partOf(incoming, part)
      if (before !== undefined && stable(before) === stable(value)) continue // ozvena vlastného zápisu
      this.saved.set(part, value)
      this.deliver(part)
    }
  }

  /**
   * Odovzdá aplikácii novšiu hodnotu časti z databázy. Miestne neuložené úpravy tej istej
   * časti majú prednosť; zapíšu sa pri najbližšom uložení. Ak aplikácia práve nepočúva,
   * hodnota počká na pripojenie alebo na najbližšie ukladanie.
   */
  private deliver(part: Part): void {
    const live = this.live
    if (!live) return
    const value = this.saved.get(part)
    const given = this.handed.get(part)
    live.onRemote((local) => {
      if (!sameRef(partOf(local, part), given, part)) return local
      this.handed.set(part, value)
      return part === 'core' ? { ...local, ...(value as Core) } : { ...local, [part]: value }
    })
  }

  /** Projekt, ktorý používateľ práve vytvoril alebo nahral; zapíše sa celý. */
  adopt(): void {
    this.loaded = true
    this.saved.clear()
    this.handed.clear()
  }

  /** Zapíše zmenené časti. Ďalšie volanie počas zápisu sa zaradí za neho. */
  save(next: ProjectData): void {
    this.target = next
    if (!this.writing) void this.flush()
  }

  private async flush(): Promise<void> {
    this.writing = true
    let failed: string | null = null
    let current: ProjectData | null = null
    try {
      while (this.target) {
        const next = this.target
        current = next
        this.target = null
        for (const part of PARTS) {
          const value = partOf(next, part)
          if (sameRef(value, this.saved.get(part), part)) continue
          // Aplikácia túto časť nezmenila – databáza je len o krok ďalej. Starý stav sa nezapisuje.
          if (this.saved.has(part) && sameRef(value, this.handed.get(part), part)) {
            this.deliver(part)
            continue
          }
          this.live?.onState('saving')
          await this.write(part, toDoc(next, part))
          this.saved.set(part, value)
          this.handed.set(part, value)
        }
      }
    } catch (e) {
      failed = errorCode(e)
      this.target = this.target ?? current // nezapísané zmeny počkajú na ďalší pokus
    } finally {
      this.writing = false
    }

    if (!failed) {
      this.attempts = 0
      this.live?.onState('saved')
      return
    }
    // invalid_argument pri správne zostavenom zápise znamená, že tento používateľ nesmie zapisovať.
    if (failed === 'invalid_argument' || failed === 'revoked' || failed === 'not_granted') {
      this.live?.onState('readonly')
      return
    }
    this.live?.onState('error')
    const pending = this.target
    if (pending && this.attempts < 3) {
      this.attempts += 1
      this.retry = setTimeout(() => this.save(pending), 4000 * this.attempts)
    }
  }

  private async write(part: Part, body: Record<string, unknown>): Promise<void> {
    const ref = this.db.doc(`${COLLECTION}/${part}`)
    try {
      await ref.set(body)
    } catch (e) {
      if (errorCode(e) !== 'unavailable') throw e
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 900))
      await ref.set(body) // prechodný výpadok: jeden opakovaný pokus
    }
  }
}
