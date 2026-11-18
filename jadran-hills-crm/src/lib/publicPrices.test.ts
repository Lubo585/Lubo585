import { describe, expect, it } from 'vitest'
import { publicKind, publicPriceGaps, type PublicPrices } from './publicPrices'

const WEB: PublicPrices = { two: [300_000, 310_000, 420_000], one: [200_000, 205_000, 260_000], parking: 13_000 }

/** Byt tak, ako ho porovnanie potrebuje: typ, podlažie, cenníková cena a či je predaný. */
const unit = (bedrooms: number, floor: number, apartment: number, sold = false) => ({ unit: { bedrooms, floor } as never, apartment, sold })

/** Jeden dom s cenami presne podľa webu. */
const house = () => [0, 1, 2].flatMap((floor) => [unit(2, floor, WEB.two[floor]), unit(1, floor, WEB.one[floor]), unit(2, floor, WEB.two[floor])])

describe('ceny na verejnej stránke oproti cenníku v CRM', () => {
  it('keď sedia, nie je čo hlásiť', () => {
    expect(publicPriceGaps(house(), 13_000, WEB)).toEqual([])
  })

  it('zmenenú cenu typu na podlaží nahlási s oboma sumami', () => {
    const units = house()
    units[0] = unit(2, 0, 305_000)
    units[2] = unit(2, 0, 305_000)
    expect(publicPriceGaps(units, 13_000, WEB)).toEqual([{ what: 'two', floor: 0, crmMin: 305_000, crmMax: 305_000, web: 300_000 }])
  })

  it('ručne zadanú cenu jedného bytu ukáže ako rozpätie', () => {
    const units = house()
    units[1] = unit(1, 0, 190_000)
    units.push(unit(1, 0, 200_000))
    expect(publicPriceGaps(units, 13_000, WEB)).toEqual([{ what: 'one', floor: 0, crmMin: 190_000, crmMax: 200_000, web: 200_000 }])
  })

  it('predané byty neporovnáva – ich cenníková cena už nikoho nezaujíma', () => {
    const units = house()
    units[0] = unit(2, 0, 999_000, true)
    expect(publicPriceGaps(units, 13_000, WEB)).toEqual([])
  })

  it('nahlási inú cenu parkovania aj podlažie, ktoré web neuvádza', () => {
    const gaps = publicPriceGaps([...house(), unit(2, 3, 500_000)], 15_000, WEB)
    expect(gaps).toEqual([
      { what: 'two', floor: 3, crmMin: 500_000, crmMax: 500_000, web: null },
      { what: 'parking', floor: null, crmMin: 15_000, crmMax: 15_000, web: 13_000 },
    ])
  })

  it('typ sa určuje podľa počtu spální', () => {
    expect(publicKind(1)).toBe('one')
    expect(publicKind(2)).toBe('two')
    expect(publicKind(3)).toBe('two')
  })
})
