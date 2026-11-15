import { describe, expect, it } from 'vitest'
import { DEMO_PARAMS } from '../data/demo'
import { createProject } from '../data/templates'
import type { ProjectData } from '../types'
import { PARTS, RemoteStore, toDoc, type Db, type QuerySnap, type SyncState } from './remote'

/** Napodobenina databázy hostiteľa: dokumenty v pamäti, odberatelia dostanú každú zmenu. */
class FakeDb implements Db {
  docs = new Map<string, Record<string, unknown>>()
  writes: string[] = []
  failures: string[] = []
  private listeners: ((s: QuerySnap) => void)[] = []

  doc(path: string) {
    return {
      set: async (data: Record<string, unknown>) => {
        const fail = this.failures.shift()
        if (fail) throw { code: fail, message: fail }
        this.writes.push(path)
        this.docs.set(path.split('/')[1], JSON.parse(JSON.stringify(data)))
        this.emit()
      },
    }
  }

  collection() {
    return {
      onSnapshot: (next: (s: QuerySnap) => void) => {
        this.listeners.push(next)
        queueMicrotask(() => this.emit())
        return () => {
          this.listeners = this.listeners.filter((l) => l !== next)
        }
      },
    }
  }

  emit(fromCache = false) {
    const snap: QuerySnap = {
      docs: [...this.docs].map(([id, body]) => ({ id, exists: true, data: () => body })),
      metadata: { fromCache, hasPendingWrites: false },
    }
    for (const l of [...this.listeners]) l(snap)
  }

  seed(d: ProjectData) {
    for (const p of PARTS) this.docs.set(p, JSON.parse(JSON.stringify(toDoc(d, p))))
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const project = () => createProject({ ...DEMO_PARAMS, startMonth: '2026-11' }, '2026-11-15')

/** Spustí úložisko a napodobní aplikáciu, ktorá drží miestny stav. */
async function boot(db: FakeDb) {
  const store = new RemoteStore(db)
  const app = { data: null as ProjectData | null, loaded: false, states: [] as SyncState[], remoteChanges: 0 }
  store.start({
    onLoaded: (d) => {
      app.data = d
      app.loaded = true
    },
    onError: () => {},
  })
  store.attach({
    onRemote: (merge) => {
      if (!app.data) return
      const next = merge(app.data)
      if (next !== app.data) app.remoteChanges += 1
      app.data = next
    },
    onState: (s) => app.states.push(s),
  })
  await tick()
  return { store, app }
}

describe('spoločné úložisko', () => {
  it('prázdna databáza znamená projekt bez dát', async () => {
    const { app } = await boot(new FakeDb())
    expect(app.loaded).toBe(true)
    expect(app.data).toBeNull()
  })

  it('nepotvrdená prázdna kópia sa neberie ako prázdna databáza', async () => {
    const db = new FakeDb()
    const store = new RemoteStore(db)
    let loaded = false
    store.start({ onLoaded: () => (loaded = true), onError: () => {} })
    db.emit(true)
    expect(loaded).toBe(false)
    await tick()
    expect(loaded).toBe(true)
  })

  it('načíta projekt po častiach a bez zmeny nič nezapisuje', async () => {
    const db = new FakeDb()
    const original = project()
    db.seed(original)
    const { store, app } = await boot(db)
    expect(app.data?.units).toEqual(original.units)
    expect(app.data?.boq.length).toBe(original.boq.length)
    expect(app.data?.settings).toEqual(original.settings)
    store.save(app.data!)
    await tick()
    expect(db.writes).toEqual([])
  })

  it('zmena jednej časti zapíše jediný dokument a ozvena sa neprejaví ako cudzia zmena', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    const d = app.data!
    app.data = { ...d, units: d.units.map((u, i) => (i === 0 ? { ...u, note: 'zmena' } : u)) }
    store.save(app.data)
    await tick()
    await tick()
    expect(db.writes).toEqual(['crm/units'])
    expect(app.remoteChanges).toBe(0)
    expect(app.states.at(-1)).toBe('saved')
    expect((db.docs.get('units')!.items as { note: string }[])[0].note).toBe('zmena')
  })

  it('zmena nastavení zapíše jadro, nie kolekcie', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    const d = app.data!
    app.data = { ...d, settings: { ...d.settings, vatPct: 13 } }
    store.save(app.data)
    await tick()
    await tick()
    expect(db.writes).toEqual(['crm/core'])
  })

  it('zmenu od iného používateľa zapracuje do miestneho stavu', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    const risks = (db.docs.get('risks')!.items as { title: string }[]).map((r, i) => (i === 0 ? { ...r, title: 'Upravil kolega' } : r))
    db.docs.set('risks', { items: risks })
    db.emit()
    expect(app.remoteChanges).toBe(1)
    expect(app.data!.risks[0].title).toBe('Upravil kolega')
    store.save(app.data!)
    await tick()
    expect(db.writes).toEqual([]) // prevzatá zmena sa nezapisuje späť
  })

  it('miestna neuložená úprava tej istej časti má prednosť', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    const d = app.data!
    app.data = { ...d, risks: d.risks.map((r, i) => (i === 0 ? { ...r, title: 'Moja úprava' } : r)) }
    db.docs.set('risks', { items: d.risks.map((r, i) => (i === 0 ? { ...r, title: 'Úprava kolegu' } : r)) })
    db.emit()
    expect(app.data.risks[0].title).toBe('Moja úprava')
    store.save(app.data)
    await tick()
    await tick()
    expect(db.writes).toEqual(['crm/risks'])
    expect((db.docs.get('risks')!.items as { title: string }[])[0].title).toBe('Moja úprava')
  })

  it('nový alebo nahraný projekt sa zapíše celý', async () => {
    const db = new FakeDb()
    const { store, app } = await boot(db)
    expect(app.data).toBeNull()
    store.adopt()
    store.save(project())
    for (let i = 0; i < 40; i++) await tick()
    expect(new Set(db.writes)).toEqual(new Set(PARTS.map((p) => `crm/${p}`)))
    expect(db.writes.length).toBe(PARTS.length)
  })

  it('odmietnutý zápis prepne na režim len na čítanie', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    db.failures.push('invalid_argument')
    app.data = { ...app.data!, tasks: [] }
    store.save(app.data)
    await tick()
    await tick()
    expect(app.states.at(-1)).toBe('readonly')
    expect(db.writes).toEqual([])
  })

  it('prechodný výpadok sa raz zopakuje', async () => {
    const db = new FakeDb()
    db.seed(project())
    const { store, app } = await boot(db)
    db.failures.push('unavailable')
    app.data = { ...app.data!, tasks: [] }
    store.save(app.data)
    await new Promise((r) => setTimeout(r, 1700))
    expect(db.writes).toEqual(['crm/tasks'])
    expect(app.states.at(-1)).toBe('saved')
  })
})
