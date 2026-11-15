// Prostredie, v ktorom aplikácia beží.
//
// Samostatne (súbor na disku, vlastný web) pracuje s úložiskom prehliadača.
// Ako stránka na claude.ai dostane od hostiteľa objekt `window.claude` a cez
// `claude.use(názov)` schopnosti navyše: spoločnú databázu a ukladanie súborov.

interface HostRuntime {
  use(name: string): Promise<unknown>
}

declare global {
  interface Window {
    claude?: HostRuntime
  }
}

/** true = stránku zobrazuje hostiteľ, ktorý vie poskytnúť schopnosti navyše. */
export const hosted = typeof window !== 'undefined' && typeof window.claude?.use === 'function'

/** Schopnosť hostiteľa, alebo null, ak ju toto zobrazenie neposkytuje. */
export async function capability<T>(name: string): Promise<T | null> {
  if (!hosted) return null
  try {
    return ((await window.claude!.use(name)) as T | null) ?? null
  } catch {
    return null
  }
}

/** Chyba hostiteľa má vždy stabilný kód; text správy sa nemá vyhodnocovať. */
export function errorCode(e: unknown): string {
  return typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : 'unavailable'
}
