// Dáta projektu v databáze Supabase v podobe, akú očakáva spoločné úložisko aplikácie.
//
// Každá časť projektu je jeden riadok tabuľky `crm_docs`. Trieda `DocsDb` z nich robí
// „snímky“ rovnako ako databáza hostiteľa: prvé načítanie všetkých častí, potom zmeny
// od ostatných. O zmene sa dozvie z upozornenia v reálnom čase a pre istotu aj
// pravidelnou kontrolou – upozornenie sa pri výpadku spojenia môže stratiť.

import type { Db, DocSnap, QuerySnap } from '../lib/remote'

export interface DocRow {
  part: string
  body: Record<string, unknown>
  updated_at: string
}

export interface DocHead {
  part: string
  updated_at: string
}

/** Úzke rozhranie nad tabuľkou – dá sa nahradiť v testoch. */
export interface DocsApi {
  list(): Promise<DocRow[]>
  heads(): Promise<DocHead[]>
  get(part: string): Promise<DocRow | null>
  /** Zapíše časť a vráti čas zápisu podľa databázy. */
  put(part: string, body: Record<string, unknown>): Promise<string>
  /** Upozornenia na zmeny; `onReady` sa volá po (opätovnom) pripojení. Vracia funkciu na odhlásenie. */
  subscribe(onChange: (part: string) => void, onReady: () => void): () => void
}

export interface DocsOptions {
  /** Ako často sa kontrolujú zmeny bez upozornenia (ms). */
  pollMs?: number
  /** Pokusy o prvé načítanie. */
  attempts?: number
  /** Základné čakanie medzi pokusmi (ms). */
  retryMs?: number
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Čas zápisu v mikrosekundách – databáza ich rozlišuje, milisekundy by dva rýchle zápisy zliali. */
export function micros(at: string): number {
  const m = /^(.*?)(?:\.(\d+))?(Z|[+-]\d\d(?::?\d\d)?)$/.exec(at.trim().replace(' ', 'T'))
  if (!m) return Date.parse(at) * 1000
  const zone = /^[+-]\d\d$/.test(m[3]) ? `${m[3]}:00` : m[3]
  const base = Date.parse(m[1] + zone)
  return base * 1000 + (m[2] ? Number((m[2] + '000000').slice(0, 6)) : 0)
}

export class DocsDb implements Db {
  private readonly api: DocsApi
  private readonly opts: Required<DocsOptions>
  /** Čas posledného známeho zápisu každej časti – staršie odpovede sa zahadzujú. */
  private readonly seen = new Map<string, string>()
  private readonly bodies = new Map<string, Record<string, unknown>>()
  private emit: (() => void) | null = null

  constructor(api: DocsApi, options: DocsOptions = {}) {
    this.api = api
    this.opts = { pollMs: options.pollMs ?? 45_000, attempts: options.attempts ?? 4, retryMs: options.retryMs ?? 1200 }
  }

  doc(path: string): { set(data: Record<string, unknown>): Promise<void> } {
    const part = path.slice(path.indexOf('/') + 1)
    return {
      set: async (data) => {
        const at = await this.api.put(part, data)
        // Vlastný zápis je odteraz najnovší známy stav; jeho ozvenu netreba spracovať.
        if (this.newer(part, at)) {
          this.seen.set(part, at)
          this.bodies.set(part, data)
        }
      },
    }
  }

  collection(): { onSnapshot(next: (snap: QuerySnap) => void, error?: (e: unknown) => void): () => void } {
    return { onSnapshot: (next, error) => this.watch(next, error) }
  }

  private newer(part: string, at: string): boolean {
    const known = this.seen.get(part)
    return !known || micros(at) > micros(known)
  }

  private take(row: DocRow): boolean {
    if (!this.newer(row.part, row.updated_at)) return false
    this.seen.set(row.part, row.updated_at)
    this.bodies.set(row.part, row.body)
    return true
  }

  private watch(next: (snap: QuerySnap) => void, fail?: (e: unknown) => void): () => void {
    let alive = true
    let loaded = false
    let timer: ReturnType<typeof setInterval> | null = null
    let checking = false

    const snapshot = (): QuerySnap => ({
      docs: [...this.bodies].map(([id, body]): DocSnap => ({ id, exists: true, data: () => body })),
      metadata: { fromCache: false, hasPendingWrites: false },
    })
    this.emit = () => {
      if (alive && loaded) next(snapshot())
    }

    const refresh = async (part: string) => {
      try {
        const row = await this.api.get(part)
        if (alive && row && this.take(row)) this.emit?.()
      } catch {
        // zmenu dobehne najbližšia pravidelná kontrola
      }
    }

    /** Porovná časy zápisov a dotiahne časti, ktoré sa zmenili. */
    const check = async () => {
      if (!alive || !loaded || checking) return
      checking = true
      try {
        const heads = await this.api.heads()
        const stale = heads.filter((h) => this.newer(h.part, h.updated_at))
        await Promise.all(stale.map((h) => refresh(h.part)))
      } catch {
        // bez spojenia sa skúsi nabudúce
      } finally {
        checking = false
      }
    }

    const load = async () => {
      let lastError: unknown = null
      for (let i = 0; i < this.opts.attempts && alive; i++) {
        try {
          const rows = await this.api.list()
          if (!alive) return
          for (const r of rows) this.take(r)
          loaded = true
          next(snapshot())
          timer = setInterval(() => void check(), this.opts.pollMs)
          return
        } catch (e) {
          lastError = e
          await wait(this.opts.retryMs * (i + 1))
        }
      }
      if (alive) fail?.(lastError)
    }

    const off = this.api.subscribe(
      (part) => void (loaded ? refresh(part) : undefined),
      () => void check(),
    )
    void load()

    return () => {
      alive = false
      this.emit = null
      if (timer) clearInterval(timer)
      off()
    }
  }
}
