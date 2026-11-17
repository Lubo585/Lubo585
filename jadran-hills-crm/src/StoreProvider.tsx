// Drží dáta projektu v pamäti, prepočítava model a priebežne ukladá zmeny –
// do úložiska prehliadača, alebo do spoločnej databázy stránky.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { compute } from './lib/calc'
import type { RemoteStore, SyncState } from './lib/remote'
import { localStore } from './lib/storage'
import { StoreContext, type Store } from './store'
import type { ID, ProjectData } from './types'

interface ProviderProps {
  initial: ProjectData
  /** Spoločná databáza; bez nej sa ukladá do prehliadača. */
  remote?: RemoteStore | null
  /** Používateľ smie dáta len čítať – zmeny sa neukladajú. */
  readOnly?: boolean
  children: ReactNode
}

export function StoreProvider({ initial, remote = null, readOnly = false, children }: ProviderProps) {
  const [data, setData] = useState<ProjectData>(initial)
  const [state, setState] = useState<SyncState>(readOnly ? 'readonly' : 'saved')
  const timer = useRef<number | null>(null)
  const latest = useRef(data)

  const persist = useCallback(() => {
    if (readOnly) return
    if (remote) remote.save(latest.current)
    else setState(localStore.save(latest.current) ? 'saved' : 'error')
  }, [remote, readOnly])

  // Zmeny sa zapisujú až po krátkej pauze, aby séria úprav bola jeden zápis.
  const schedule = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(persist, remote ? 800 : 400)
  }, [persist, remote])

  useEffect(() => {
    latest.current = data
    schedule()
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [data, schedule])

  // Rozpracované zmeny sa uložia aj pri zatvorení okna.
  useEffect(() => {
    window.addEventListener('pagehide', persist)
    return () => window.removeEventListener('pagehide', persist)
  }, [persist])

  // Zmeny od iných používateľov a stav ukladania zo spoločnej databázy.
  useEffect(() => {
    if (!remote) return
    return remote.attach({
      onRemote: (merge) => setData(merge),
      onState: (s) => setState((prev) => (prev === 'readonly' ? prev : s)),
    })
  }, [remote])

  const set = useCallback(
    (fn: (d: ProjectData) => ProjectData) => {
      setData((d) => {
        const next = fn(d)
        return next === d ? d : { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } }
      })
      // Stav „uložené“ nemá svietiť, kým úprava ešte čaká na zápis do spoločnej databázy.
      if (remote && !readOnly) {
        setState((prev) => (prev === 'readonly' ? prev : 'saving'))
        schedule()
      }
    },
    [remote, readOnly, schedule],
  )

  const store = useMemo<Store>(() => {
    const patch: Store['patch'] = (key, id, p) =>
      set((d) => ({ ...d, [key]: (d[key] as { id: ID }[]).map((x) => (x.id === id ? { ...x, ...p } : x)) }))
    const add: Store['add'] = (key, item) => set((d) => ({ ...d, [key]: [...(d[key] as unknown[]), item] }))
    const remove: Store['remove'] = (key, id) =>
      set((d) => ({ ...d, [key]: (d[key] as { id: ID }[]).filter((x) => x.id !== id) }))
    const setSettings: Store['setSettings'] = (fn) => set((d) => ({ ...d, settings: fn(d.settings) }))
    return { data, r: compute(data), sync: { shared: !!remote, state }, set, patch, add, remove, setSettings }
  }, [data, state, remote, set])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
