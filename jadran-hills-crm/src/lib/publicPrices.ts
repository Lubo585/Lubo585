// Ceny na verejnej stránke sú zapísané napevno v súbore web/prices.json – stránka si ich
// z CRM nečíta. Keď sa cenník v CRM zmení a web ostane starý, kupujúci vidí inú cenu než
// obchodník. Tento modul oba cenníky porovná, aby CRM na rozdiel upozornilo.

import type { UnitCalc } from './calc'

/** Ceny na webe: apartmán s dvoma a s jednou spálňou podľa podlažia (0 = prízemie) a parkovacie miesto. */
export interface PublicPrices {
  two: number[]
  one: number[]
  parking: number
}

export type PublicKind = 'two' | 'one'

export interface PriceGap {
  /** Typ apartmánu, alebo parkovacie miesto. */
  what: PublicKind | 'parking'
  /** Podlažie (0 = prízemie); pri parkovaní null. */
  floor: number | null
  /** Najnižšia a najvyššia cena v CRM – líšia sa, ak má niektorý byt cenu zadanú ručne. */
  crmMin: number
  crmMax: number
  /** Cena na webe; null, ak web toto podlažie vôbec neuvádza. */
  web: number | null
}

/** Web rozlišuje len dva typy: s dvoma spálňami (a viac) a s jednou. */
export const publicKind = (bedrooms: number): PublicKind => (bedrooms >= 2 ? 'two' : 'one')

/**
 * Rozdiely medzi cenníkom v CRM a cenami na webe. Porovnávajú sa cenníkové ceny bytov,
 * ktoré sú ešte na predaj; prázdny zoznam znamená, že web sedí.
 */
export function publicPriceGaps(units: Pick<UnitCalc, 'unit' | 'apartment' | 'sold'>[], parkingPrice: number, web: PublicPrices): PriceGap[] {
  const groups = new Map<string, { what: PublicKind; floor: number; prices: number[] }>()
  for (const u of units) {
    if (u.sold) continue
    const what = publicKind(u.unit.bedrooms)
    const key = `${what}.${u.unit.floor}`
    const group = groups.get(key) ?? { what, floor: u.unit.floor, prices: [] }
    group.prices.push(u.apartment)
    groups.set(key, group)
  }
  const gaps: PriceGap[] = []
  for (const { what, floor, prices } of [...groups.values()].sort((a, b) => (a.what === b.what ? a.floor - b.floor : a.what === 'two' ? -1 : 1))) {
    const crmMin = Math.min(...prices)
    const crmMax = Math.max(...prices)
    const shown = web[what][floor] ?? null
    if (shown === null || crmMin !== shown || crmMax !== shown) gaps.push({ what, floor, crmMin, crmMax, web: shown })
  }
  if (parkingPrice !== web.parking) gaps.push({ what: 'parking', floor: null, crmMin: parkingPrice, crmMax: parkingPrice, web: web.parking })
  return gaps
}
