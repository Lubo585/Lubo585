// Prístup k dátam projektu a k vypočítaným výsledkom z ľubovoľného modulu.

import { createContext, useContext } from 'react'
import type { Results } from './lib/calc'
import type { CollectionKey, ID, ProjectData, Settings } from './types'

type Item<K extends CollectionKey> = ProjectData[K][number]

export interface Store {
  data: ProjectData
  r: Results
  /** false = prehliadač neumožnil uloženie (súkromné okno, plné úložisko). */
  persisted: boolean
  set(fn: (d: ProjectData) => ProjectData): void
  patch<K extends CollectionKey>(key: K, id: ID, patch: Partial<Item<K>>): void
  add<K extends CollectionKey>(key: K, item: Item<K>): void
  remove(key: CollectionKey, id: ID): void
  setSettings(fn: (s: Settings) => Settings): void
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('Store nie je inicializovaný')
  return s
}
