import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuerySnap } from '../lib/remote'
import { DocsDb, micros, type DocHead, type DocRow, type DocsApi } from './docs'

/** Tabuľka v pamäti s hodinami, ktoré idú len dopredu. */
class FakeTable implements DocsApi {
  rows = new Map<string, DocRow>()
  clock = Date.parse('2026-01-01T00:00:00Z')
  failList = 0
  onChange: ((part: string) => void) | null = null
  onReady: (() => void) | null = null
  getDelay: Promise<void> | null = null
  puts = 0

  tick(): string {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }
  /** Zápis iného používateľa. */
  remote(part: string, body: Record<string, unknown>, notify = true): void {
    this.rows.set(part, { part, body, updated_at: this.tick() })
    if (notify) this.onChange?.(part)
  }
  async list(): Promise<DocRow[]> {
    if (this.failList > 0) {
      this.failList -= 1
      throw Object.assign(new Error('offline'), { code: 'unavailable' })
    }
    return [...this.rows.values()].map((r) => ({ ...r }))
  }
  async heads(): Promise<DocHead[]> {
    return [...this.rows.values()].map((r) => ({ part: r.part, updated_at: r.updated_at }))
  }
  async get(part: string): Promise<DocRow | null> {
    const row = this.rows.get(part)
    const copy = row ? { ...row } : null
    if (this.getDelay) await this.getDelay
    return copy
  }
  async put(part: string, body: Record<string, unknown>): Promise<string> {
    this.puts += 1
    const at = this.tick()
    this.rows.set(part, { part, body, updated_at: at })
    return at
  }
  subscribe(onChange: (part: string) => void, onReady: () => void): () => void {
    this.onChange = onChange
    this.onReady = onReady
    return () => {
      this.onChange = null
      this.onReady = null
    }
  }
}

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function open(table: FakeTable, options = {}) {
  const db = new DocsDb(table, { pollMs: 60_000, retryMs: 1, ...options })
  const snaps: QuerySnap[] = []
  const errors: unknown[] = []
  const stop = db.collection().onSnapshot((s) => snaps.push(s), (e) => errors.push(e))
  const last = () => Object.fromEntries(snaps[snaps.length - 1].docs.map((d) => [d.id, d.data()]))
  return { db, snaps, errors, stop, last }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('micros', () => {
  it('rozlíši zápisy v tej istej milisekunde', () => {
    expect(micros('2026-11-17T16:35:23.557257+00:00')).toBeGreaterThan(micros('2026-11-17T16:35:23.557199+00:00'))
    expect(micros('2026-11-17T16:35:23.5+00:00')).toBe(micros('2026-11-17T16:35:23.500000+00:00'))
  })
  it('rozumie rôznym zápisom času', () => {
    const a = micros('2026-11-17T16:35:23.557257+00:00')
    expect(micros('2026-11-17 16:35:23.557257+00')).toBe(a)
    expect(micros('2026-11-17T16:35:23.557257Z')).toBe(a)
    expect(micros('2026-11-17T17:35:23.557257+01:00')).toBe(a)
    expect(micros('2026-11-17T16:35:23Z')).toBe(Date.parse('2026-11-17T16:35:23Z') * 1000)
  })
})

describe('DocsDb', () => {
  it('prvá snímka obsahuje všetky časti projektu', async () => {
    const t = new FakeTable()
    t.remote('core', { schema: 1 })
    t.remote('tasks', { items: [1] })
    const o = open(t)
    await flush()
    expect(o.snaps).toHaveLength(1)
    expect(o.last()).toEqual({ core: { schema: 1 }, tasks: { items: [1] } })
    expect(o.snaps[0].metadata).toEqual({ fromCache: false, hasPendingWrites: false })
    o.stop()
  })

  it('prázdna databáza dá prázdnu snímku, nie chybu', async () => {
    const o = open(new FakeTable())
    await flush()
    expect(o.snaps).toHaveLength(1)
    expect(o.snaps[0].docs).toEqual([])
    expect(o.errors).toEqual([])
    o.stop()
  })

  it('zmena od iného používateľa príde ako nová snímka', async () => {
    const t = new FakeTable()
    t.remote('tasks', { items: [1] })
    const o = open(t)
    await flush()
    t.remote('tasks', { items: [1, 2] })
    await flush()
    expect(o.snaps).toHaveLength(2)
    expect(o.last().tasks).toEqual({ items: [1, 2] })
    o.stop()
  })

  it('ozvena vlastného zápisu snímku nevyvolá', async () => {
    const t = new FakeTable()
    t.remote('tasks', { items: [1] })
    const o = open(t)
    await flush()
    await o.db.doc('crm/tasks').set({ items: [1, 2] })
    t.onChange?.('tasks') // databáza ohlási náš vlastný zápis
    await flush()
    expect(o.snaps).toHaveLength(1)
    expect(t.rows.get('tasks')?.body).toEqual({ items: [1, 2] })
    o.stop()
  })

  it('oneskorená odpoveď so starším stavom neprepíše novší vlastný zápis', async () => {
    const t = new FakeTable()
    t.remote('tasks', { items: ['v0'] })
    const o = open(t)
    await flush()
    await o.db.doc('crm/tasks').set({ items: ['v1'] })
    // čítanie zachytí v1, ale odpoveď dorazí až po zápise v2
    let release = () => {}
    t.getDelay = new Promise((r) => (release = r))
    t.onChange?.('tasks')
    await flush()
    t.getDelay = null
    await o.db.doc('crm/tasks').set({ items: ['v2'] })
    release()
    await flush()
    expect(o.snaps).toHaveLength(1)
    // ďalšia cudzia zmena už prejde a nesie najnovší stav
    t.remote('tasks', { items: ['v3'] })
    await flush()
    expect(o.last().tasks).toEqual({ items: ['v3'] })
    o.stop()
  })

  it('zmenu bez upozornenia zachytí pravidelná kontrola', async () => {
    vi.useFakeTimers()
    const t = new FakeTable()
    t.remote('costs', { items: [1] })
    const o = open(t, { pollMs: 5000 })
    await vi.advanceTimersByTimeAsync(10)
    t.remote('costs', { items: [1, 2] }, false) // upozornenie sa stratilo
    await vi.advanceTimersByTimeAsync(5100)
    expect(o.last().costs).toEqual({ items: [1, 2] })
    o.stop()
  })

  it('po obnovení spojenia sa zmeny dotiahnu hneď', async () => {
    const t = new FakeTable()
    t.remote('risks', { items: [] })
    const o = open(t)
    await flush()
    t.remote('risks', { items: ['nové'] }, false)
    t.onReady?.()
    await flush()
    expect(o.last().risks).toEqual({ items: ['nové'] })
    o.stop()
  })

  it('prvé načítanie sa pri výpadku zopakuje', async () => {
    vi.useFakeTimers()
    const t = new FakeTable()
    t.remote('core', { schema: 1 })
    t.failList = 2
    const o = open(t)
    await vi.advanceTimersByTimeAsync(50)
    expect(o.errors).toEqual([])
    expect(o.snaps).toHaveLength(1)
    o.stop()
  })

  it('trvalý výpadok skončí chybou', async () => {
    vi.useFakeTimers()
    const t = new FakeTable()
    t.failList = 99
    const o = open(t, { attempts: 3 })
    await vi.advanceTimersByTimeAsync(200)
    expect(o.snaps).toHaveLength(0)
    expect(o.errors).toHaveLength(1)
    o.stop()
  })

  it('po odhlásení sa už nič nedoručuje', async () => {
    const t = new FakeTable()
    t.remote('tasks', { items: [1] })
    const o = open(t)
    await flush()
    o.stop()
    expect(t.onChange).toBeNull()
    t.rows.set('tasks', { part: 'tasks', body: { items: [9] }, updated_at: t.tick() })
    await flush()
    expect(o.snaps).toHaveLength(1)
  })
})
