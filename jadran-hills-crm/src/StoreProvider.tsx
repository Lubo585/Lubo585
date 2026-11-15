// Drží dáta projektu v pamäti, prepočítava model a priebežne ukladá zmeny.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { compute } from './lib/calc'
import { localStore, type Storage } from './lib/storage'
import { StoreContext, type Store } from './store'
import type { ID, ProjectData } from './types'

interface ProviderProps {
  initial: ProjectData
  storage?: Storage
  children: ReactNode
}

export function StoreProvider({ initial, storage = localStore, children }: ProviderProps) {
  const [data, setData] = useState<ProjectData>(initial)
  const [persisted, setPersisted] = useState(true)
  const timer = useRef<number | null>(null)
  const latest = useRef(data)

  useEffect(() => {
    latest.current = data
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPersisted(storage.save(latest.current)), 400)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [data, storage])

  // Uloží rozpracované zmeny aj pri zatvorení okna.
  useEffect(() => {
    const flush = () => storage.save(latest.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [storage])

  const set = useCallback((fn: (d: ProjectData) => ProjectData) => {
    setData((d) => {
      const next = fn(d)
      return next === d ? d : { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } }
    })
  }, [])

  const store = useMemo<Store>(() => {
    const patch: Store['patch'] = (key, id, p) =>
      set((d) => ({ ...d, [key]: (d[key] as { id: ID }[]).map((x) => (x.id === id ? { ...x, ...p } : x)) }))
    const add: Store['add'] = (key, item) => set((d) => ({ ...d, [key]: [...(d[key] as unknown[]), item] }))
    const remove: Store['remove'] = (key, id) =>
      set((d) => ({ ...d, [key]: (d[key] as { id: ID }[]).filter((x) => x.id !== id) }))
    const setSettings: Store['setSettings'] = (fn) => set((d) => ({ ...d, settings: fn(d.settings) }))
    return { data, r: compute(data), persisted, set, patch, add, remove, setSettings }
  }, [data, persisted, set])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
