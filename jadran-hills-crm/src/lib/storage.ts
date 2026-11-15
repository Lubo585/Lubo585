// Ukladanie dát projektu. Rozhranie `Storage` je zámerne malé, aby sa lokálne
// úložisko prehliadača dalo neskôr nahradiť serverom s prihlásením.

import type { CollectionKey, ProjectData } from '../types'

const KEY = 'jhcrm:data:v1'

export interface Storage {
  load(): ProjectData | null
  save(data: ProjectData): boolean
  clear(): void
}

const COLLECTIONS: CollectionKey[] = [
  'parcels', 'buildings', 'tech', 'units', 'clients', 'activities', 'payments', 'costs',
  'boqSections', 'boq', 'phases', 'contacts', 'tenders', 'permits', 'documents', 'risks', 'tasks',
]

/** Overí a doplní načítané dáta (import zo súboru alebo z úložiska). */
export function normalize(raw: unknown): ProjectData | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<ProjectData> & Record<string, unknown>
  if (d.schema !== 1 || !d.project || !d.settings) return null
  for (const k of COLLECTIONS) {
    if (!Array.isArray(d[k])) (d as Record<string, unknown>)[k] = []
  }
  if (!d.meta) d.meta = { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  return d as ProjectData
}

export const localStore: Storage = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? normalize(JSON.parse(raw)) : null
    } catch {
      return null
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* úložisko nie je dostupné */
    }
  },
}
