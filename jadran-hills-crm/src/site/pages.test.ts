import { describe, expect, it } from 'vitest'
import priceData from '../../web/prices.json'
import template from '../../web/site.template.html?raw'
import {
  BASE_LANG,
  LANGS,
  applyBlocks,
  checkDicts,
  contactEmail,
  formatArea,
  formatPrice,
  isOptionalVisual,
  priceTable,
  renderPage,
  siteBase,
  templateKeys,
  visualFiles,
  type Dict,
  type Dicts,
  type LangCode,
  type PageOptions,
} from './pages'

const files = import.meta.glob<Dict>('../../web/i18n/*.json', { eager: true, import: 'default' })
const dicts = Object.fromEntries(LANGS.map((l) => [l.code, files[`../../web/i18n/${l.code}.json`]])) as Dicts
const prices = priceTable(priceData)
/** Stránka s cenníkom, ktorý ide na web; ostatné vlastnosti podľa testu. */
const render = (lang: LangCode, from: Dicts = dicts, options: PageOptions = {}): string => renderPage(template, lang, from, { prices, ...options })
const pages = Object.fromEntries(LANGS.map((l) => [l.code, render(l.code, dicts)]))
/** Stránky tak, ako idú na web: s kontaktným e-mailom a s vizualizáciami. */
const full = Object.fromEntries(LANGS.map((l) => [l.code, render(l.code, dicts, { email: 'info@example.com', visuals: true })]))
/** To isté aj s vizualizáciou domov v leteckom zábere. */
const fullMontage = Object.fromEntries(
  LANGS.map((l) => [l.code, render(l.code, dicts, { email: 'info@example.com', visuals: true, montage: true })]),
)

/** Stavba stránky bez textov: poradie značiek a ich atribútov (označenie zobrazeného jazyka sa líši zámerne). */
const skeleton = (html: string): string[] =>
  [...html.matchAll(/<\/?[a-zA-Z][^>]*>/g)].map((m) => m[0].replace(/="[^"]*"/g, '').replace(' aria-current', '').replace(/\s+/g, ' '))

describe('slovníky prezentačnej stránky', () => {
  it('každý jazyk má slovník a žiadny slovník nie je navyše', () => {
    expect(Object.keys(files).sort()).toEqual(LANGS.map((l) => `../../web/i18n/${l.code}.json`).sort())
  })

  it('sú úplné, bez prázdnych textov a s rovnakými číslami ako slovenský originál', () => {
    expect(checkDicts(template, dicts)).toEqual([])
  })

  it('šablóna používa len texty, ktoré slovník pozná', () => {
    expect(templateKeys(template).filter((key) => !(key in dicts[BASE_LANG]))).toEqual([])
  })

  it('kontrola odhalí chýbajúci preklad, zmenené číslo aj prázdny text', () => {
    const broken = structuredClone(dicts)
    delete broken.en['hero.cta']
    broken.de['apts.oneSpec'] = '38,5 m² + Terrasse 12 m²'
    broken.hu['form.submit'] = ' '
    broken.hr['navyse'] = 'bez originálu'
    const problems = checkDicts(template, broken)
    expect(problems).toContain('en: chýba preklad „hero.cta“')
    expect(problems).toContain('de: „apts.oneSpec“ má iné čísla než slovenský text')
    expect(problems).toContain('hu: text „form.submit“ je prázdny')
    expect(problems).toContain('hr: preklad „navyse“ nemá slovenský originál')
  })

  it('desatinná čiarka a bodka sa pri porovnaní čísel berú ako to isté', () => {
    expect(dicts.sk['feat.pool.text']).toContain('7,4 × 2,7')
    expect(dicts.en['feat.pool.text']).toContain('7.4 × 2.7')
  })
})

describe('jazykové verzie stránky', () => {
  it.each(LANGS.map((l) => l.code))('%s: stránka je celá a hlási svoj jazyk', (code) => {
    const html = pages[code]
    expect(html).not.toContain('{{')
    expect(html).toContain(`<html lang="${code}">`)
    expect(html).toContain(`<title>${dicts[code]['meta.title']}</title>`)
  })

  it('všetky verzie majú rovnakú stavbu – texty nikde nerozbili značky', () => {
    const base = skeleton(pages[BASE_LANG])
    const fullBase = skeleton(full[BASE_LANG])
    const montageBase = skeleton(fullMontage[BASE_LANG])
    for (const { code } of LANGS) {
      expect(skeleton(pages[code]), code).toEqual(base)
      expect(skeleton(full[code]), `${code} s e-mailom a vizualizáciami`).toEqual(fullBase)
      expect(skeleton(fullMontage[code]), `${code} aj s vizualizáciou polohy`).toEqual(montageBase)
    }
  })

  it('texty sa vkladajú tak, aby nemohli zmeniť stavbu stránky', () => {
    const tricky = structuredClone(dicts)
    tricky.en['hero.title1'] = 'Sea & "sky" <b>'
    tricky.en['place.sea.alt'] = 'A "quoted" jetty'
    const html = render('en', tricky)
    expect(html).toContain('<span>Sea &amp; &quot;sky&quot; &lt;b&gt;</span>')
    expect(html).toContain('alt="A &quot;quoted&quot; jetty"')
    expect(skeleton(html)).toEqual(skeleton(pages.en))
  })

  it('prepínač ponúka všetky jazyky a označí práve zobrazený', () => {
    for (const { code } of LANGS) {
      const html = pages[code]
      for (const to of LANGS) expect(html, `${code} → ${to.code}`).toContain(`hreflang="${to.code}" lang="${to.code}" data-lang-link="${to.code}"`)
      const current = [...html.matchAll(/data-lang-link="([a-z]+)"[^>]*aria-current="true"/g)].map((m) => m[1])
      // raz v navigácii, raz v menu na telefóne
      expect(current, code).toEqual([code, code])
    }
  })

  it('odkazy medzi jazykmi a na súbory sedia s umiestnením stránky', () => {
    expect(pages.sk).toContain('<a href="./en/" hreflang="en"')
    expect(pages.sk).toContain('<a href="./" hreflang="sk"')
    expect(pages.sk).toContain('href="./crm/"')
    expect(pages.sk).toContain('src="./img/hero-more-1600.webp"')
    expect(pages.sk).toContain('src="../src/site/main.ts"')
    expect(pages.de).toContain('<a href="../" hreflang="sk"')
    expect(pages.de).toContain('<a href="../hu/" hreflang="hu"')
    expect(pages.de).toContain('href="../crm/"')
    expect(pages.de).toContain('src="../img/hero-more-1600.webp"')
    expect(pages.de).toContain('src="../../src/site/main.ts"')
  })

  it('ponuka prepnutia je pri každom jazyku napísaná v ňom samom', () => {
    for (const { code } of LANGS) {
      for (const to of LANGS) expect(pages[code]).toContain(`data-suggest="${dicts[to.code]['js.suggest.text']}"`)
    }
  })

  it('formulár posiela rovnaké hodnoty záujmu bez ohľadu na jazyk stránky', () => {
    const values = (html: string) => [...html.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1])
    expect(values(pages.sk)).toHaveLength(6)
    for (const { code } of LANGS) expect(values(pages[code]), code).toEqual(values(pages.sk))
  })

  it('riadky veľkého nadpisu v úvode sú krátke v každom jazyku', () => {
    for (const { code } of LANGS) {
      expect(dicts[code]['hero.title1'].length, code).toBeLessThanOrEqual(14)
      expect(dicts[code]['hero.title2'].length, code).toBeLessThanOrEqual(14)
    }
  })
})

describe('pôdorysy a ceny', () => {
  const NBSP = '\u00a0'

  it('ceny a výmery sa zapisujú podľa jazyka stránky', () => {
    expect(formatPrice(304500, 'sk')).toBe(`304${NBSP}500${NBSP}€`)
    expect(formatPrice(304500, 'hu')).toBe(`304${NBSP}500${NBSP}€`)
    expect(formatPrice(304500, 'hr')).toBe(`304.500${NBSP}€`)
    expect(formatPrice(304500, 'de')).toBe(`304.500${NBSP}€`)
    expect(formatPrice(304500, 'en')).toBe('€304,500')
    expect(formatArea(2.5, 'sk')).toBe(`2,50${NBSP}m²`)
    expect(formatArea(60.12, 'en')).toBe(`60.12${NBSP}m²`)
  })

  it('cenník sa rozpíše na ceny podľa typu a podlažia a nezmysel odmietne', () => {
    expect(priceTable({ two: [1000, 2000], parking: 500 })).toEqual({ 'two.0': 1000, 'two.1': 2000, parking: 500 })
    expect(() => priceTable({ two: [1000, 0] })).toThrow()
    expect(() => priceTable({ parking: '13000' })).toThrow()
    expect(() => priceTable({ parking: 99.5 })).toThrow()
    expect(() => priceTable([1, 2])).toThrow()
  })

  it('cenník má všetky ceny, zaokrúhlené a rastúce s podlažím', () => {
    expect(Object.keys(prices).sort()).toEqual(['one.0', 'one.1', 'one.2', 'parking', 'two.0', 'two.1', 'two.2'])
    for (const [name, value] of Object.entries(prices)) expect(value % 500, name).toBe(0)
    for (const kind of ['one', 'two']) {
      expect(prices[`${kind}.0`]).toBeLessThan(prices[`${kind}.1`])
      expect(prices[`${kind}.1`]).toBeLessThan(prices[`${kind}.2`])
      expect(prices['one.0']).toBeLessThan(prices['two.0'])
    }
  })

  it('každá jazyková verzia ukáže všetky ceny vo svojom zápise', () => {
    for (const { code } of LANGS) {
      for (const [name, value] of Object.entries(prices)) expect(pages[code], `${code}: ${name}`).toContain(formatPrice(value, code))
      // pri každom podlaží dve ceny, v pôdorysoch tri podlažia a parkovanie pre oba typy
      expect(pages[code].match(/<em class="price">/g), code).toHaveLength(6)
      expect(pages[code].match(/<table class="prices">/g), code).toHaveLength(2)
      expect(pages[code].split(formatPrice(prices.parking, code)), code).toHaveLength(3)
    }
  })

  it('bez cenníka sa stránka nezostaví', () => {
    expect(() => renderPage(template, 'sk', dicts)).toThrow(/cenník/i)
    expect(() => renderPage(template, 'sk', dicts, { prices: { ...prices, 'two.2': undefined as unknown as number } })).toThrow()
  })

  it('výmery miestností dávajú vnútornú plochu apartmánu', () => {
    const lists = [...template.matchAll(/<dl class="rooms">([\s\S]*?)<\/dl>/g)].map((m) => m[1])
    expect(lists).toHaveLength(2)
    for (const [list, total] of [
      [lists[0], 60.12],
      [lists[1], 37.53],
    ] as const) {
      const [rooms, sum] = list.split('class="rooms-sum"')
      const areas = [...rooms.matchAll(/\{\{@area:([0-9.]+)\}\}/g)].map((m) => Number(m[1]))
      expect(areas.reduce((a, b) => a + b, 0)).toBeCloseTo(total, 6)
      expect(Number(/\{\{@area:([0-9.]+)\}\}/.exec(sum)?.[1])).toBe(total)
    }
  })

  it('pôdorysy sú len tam, kde sú k dispozícii obrázky; popis a ceny vždy', () => {
    for (const { code } of LANGS) {
      expect(pages[code], code).not.toContain('plan-pic')
      expect(pages[code].match(/<article class="plan"/g), code).toHaveLength(2)
      expect(full[code].match(/<article class="plan plan--pic"/g), code).toHaveLength(2)
      expect(full[code], code).toContain('/vizualizacie/podorys-2-spalne-600.webp')
      expect(full[code], code).toContain('/vizualizacie/podorys-1-spalna-600.webp')
      for (const html of [pages[code], full[code]]) {
        expect(html, code).toContain(dicts[code]['plans.two.text'])
        expect(html, code).toContain(dicts[code]['rooms.inside'])
        expect(html, code).toContain(formatArea(60.12, code))
        expect(html, code).toContain(formatArea(37.53, code))
      }
    }
  })
})

describe('kontaktný e-mail', () => {
  it('bez e-mailu stránka odkazuje len na formulár', () => {
    for (const { code } of LANGS) {
      expect(pages[code], code).not.toContain('mailto:')
      expect(pages[code], code).not.toContain('{{')
      expect(pages[code], code).toContain(dicts[code]['privacy.who.form'])
    }
  })

  it('s e-mailom ho stránka ukáže pri formulári, v pätičke a pri ochrane údajov', () => {
    for (const { code } of LANGS) {
      const html = full[code]
      expect(html.match(/<a href="mailto:info@example\.com">info@example\.com<\/a>/g), code).toHaveLength(3)
      expect(html, code).toContain(`${dicts[code]['contact.mailLabel']} <a href="mailto:`)
      expect(html, code).not.toContain(dicts[code]['privacy.who.form'])
    }
  })

  it('adresu očistí a nezmysel odmietne', () => {
    expect(contactEmail(undefined)).toBe('')
    expect(contactEmail('  info@example.com ')).toBe('info@example.com')
    expect(() => contactEmail('info(at)example.com')).toThrow()
    expect(() => contactEmail('info@example')).toThrow()
    expect(() => render('sk', dicts, { email: '"><script>' })).toThrow()
  })
})

describe('vizualizácie a zábery polohy', () => {
  const names = visualFiles(template)

  it('šablóna vie, ktoré súbory potrebuje', () => {
    expect(names).toContain('poloha-920.webp')
    expect(names).toContain('terasy-1600.webp')
    expect(names).toEqual([...new Set(names)].sort())
    expect(names).toHaveLength(19)
  })

  it('bez súborov sa časti s nimi vynechajú celé', () => {
    for (const { code } of LANGS) {
      expect(pages[code], code).not.toContain('vizualizacie')
      expect(pages[code], code).not.toContain(dicts[code]['viz.note'])
      expect(pages[code], code).not.toContain(dicts[code]['credits.visuals'])
    }
  })

  it('so súbormi stránka ukáže polohu domov aj vizualizácie', () => {
    for (const { code } of LANGS) {
      const html = full[code]
      for (const name of names.filter((n) => !isOptionalVisual(n))) expect(html, `${code}: ${name}`).toContain(`/vizualizacie/${name}`)
      expect(html.match(/class="viz-item/g), code).toHaveLength(6)
      expect(html, code).toContain('id="poloha"')
      expect(html, code).toContain('id="vizualizacie"')
      expect(html, code).toContain(dicts[code]['viz.note'])
      expect(html, code).toContain(dicts[code]['credits.visuals'])
    }
    // celý obrázok sa otvára odkazom, ktorý sedí s umiestnením stránky
    expect(full.sk).toContain('href="./vizualizacie/terasy-1600.webp"')
    expect(full.hu).toContain('href="../vizualizacie/terasy-1600.webp"')
  })

  it('vizualizácia domov v leteckom zábere je voliteľná', () => {
    expect(names.filter(isOptionalVisual)).toEqual(['poloha-920.webp'])
    for (const { code } of LANGS) {
      // bez nej je hlavným obrázkom bloku záber pozemku s morom a vedľa textu ostáva jeden záber
      expect(full[code], code).not.toContain('vizualizacie/poloha-')
      expect(full[code], code).not.toContain(dicts[code]['spot.main.caption'])
      expect(full[code].match(/pozemok-more-721\.webp/g), code).toHaveLength(1)
      expect(full[code], code).toContain('class="spot-pair spot-pair--one"')
      // s ňou je hlavným obrázkom ona a zábery pozemku sú dva vedľa seba
      expect(fullMontage[code], code).toContain('/vizualizacie/poloha-920.webp')
      expect(fullMontage[code], code).toContain(dicts[code]['spot.main.caption'])
      expect(fullMontage[code].match(/pozemok-more-721\.webp/g), code).toHaveLength(1)
      expect(fullMontage[code], code).not.toContain('spot-pair--one')
      // text o polohe a oba zábery pozemku sú v oboch podobách
      for (const html of [full[code], fullMontage[code]]) {
        expect(html, code).toContain(dicts[code]['spot.text'])
        expect(html, code).toContain(dicts[code]['spot.sea.caption'])
        expect(html, code).toContain(dicts[code]['spot.top.caption'])
      }
    }
    // sama osebe, bez ostatných súborov, sa neukáže
    expect(render('sk', dicts, { montage: true })).not.toContain('vizualizacie')
  })

  it('vzdialenosť od pláže je rovnaká v každom jazyku a nezávisí od obrázkov', () => {
    for (const { code } of LANGS) {
      expect(dicts[code]['dist.seaValue'], code).toBe('30 m')
      expect(pages[code], code).toContain(`<b>${dicts[code]['dist.seaValue']}</b>`)
      // tú istú vzdialenosť uvádza úvod, popis stránky, text o mori aj jeden z bodov projektu
      for (const key of ['hero.sub', 'meta.description', 'place.sea.text', 'feat.beach.title']) expect(dicts[code][key], `${code}: ${key}`).toMatch(/\b30\b/)
    }
  })

  it('projekt má deväť bodov vrátane cesty, ihrísk a pláže', () => {
    for (const { code } of LANGS) {
      expect(pages[code].match(/<ul class="features"[\s\S]*?<\/ul>/)?.[0].match(/<li /g), code).toHaveLength(9)
      for (const key of ['feat.road.title', 'feat.play.title', 'feat.beach.title']) expect(pages[code], `${code}: ${key}`).toContain(dicts[code][key])
    }
  })
})

describe('podmienené časti šablóny', () => {
  it('zapnutá časť ostane, vypnutá zmizne a opačná naopak', () => {
    const src = 'a{{#x}}b{{/x}}c{{^x}}d{{/x}}e'
    expect(applyBlocks(src, { x: true })).toBe('abce')
    expect(applyBlocks(src, { x: false })).toBe('acde')
  })

  it('značka na samostatnom riadku po sebe nenechá prázdny riadok', () => {
    expect(applyBlocks('1\n  {{#x}}\n2\n  {{/x}}\n3\n', { x: true })).toBe('1\n2\n3\n')
    expect(applyBlocks('1\n  {{#x}}\n2\n  {{/x}}\n3\n', { x: false })).toBe('1\n3\n')
  })

  it('časti sa môžu vnárať', () => {
    const src = 'a{{#x}}b{{#y}}c{{/y}}{{^y}}d{{/y}}e{{/x}}f'
    expect(applyBlocks(src, { x: true, y: true })).toBe('abcef')
    expect(applyBlocks(src, { x: true, y: false })).toBe('abdef')
    expect(applyBlocks(src, { x: false, y: true })).toBe('af')
    expect(applyBlocks('{{#x}}a{{^x}}b{{/x}}c{{/x}}', { x: true })).toBe('ac')
  })

  it('neznámu, neuzavretú alebo prekríženú časť odmietne', () => {
    expect(() => applyBlocks('{{#y}}a{{/y}}', { x: true })).toThrow()
    expect(() => applyBlocks('{{#x}}a', { x: true })).toThrow()
    expect(() => applyBlocks('a{{/x}}', { x: true })).toThrow()
    expect(() => applyBlocks('{{#x}}a{{#y}}b{{/x}}c{{/y}}', { x: true, y: true })).toThrow()
  })

  it('texty vo vypnutých častiach kontrola slovníkov stále vyžaduje', () => {
    expect(templateKeys(template)).toContain('viz.note')
    expect(templateKeys(template)).toContain('privacy.who.form')
  })
})

describe('odkazy na jazykové verzie pre vyhľadávače', () => {
  it('bez úplnej adresy webu sa nevkladajú', () => {
    expect(pages.sk).not.toContain('rel="alternate"')
    expect(pages.sk).not.toContain('rel="canonical"')
  })

  it('s adresou webu má každá stránka vlastnú adresu a odkazy na ostatné jazyky', () => {
    const html = render('hr', dicts, { siteUrl: 'https://www.example.com' })
    expect(html).toContain('<link rel="canonical" href="https://www.example.com/hr/" />')
    expect(html).toContain('<link rel="alternate" hreflang="sk" href="https://www.example.com/" />')
    expect(html).toContain('<link rel="alternate" hreflang="hu" href="https://www.example.com/hu/" />')
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://www.example.com/" />')
    expect(html).toContain('<meta property="og:url" content="https://www.example.com/hr/" />')
    expect(html.match(/rel="alternate"/g)).toHaveLength(LANGS.length + 1)
    expect(html.match(/og:locale:alternate/g)).toHaveLength(LANGS.length - 1)
  })

  it('adresu webu zjednotí a neúplnú odmietne', () => {
    expect(siteBase(undefined)).toBe('')
    expect(siteBase('  ')).toBe('')
    expect(siteBase('https://www.example.com')).toBe('https://www.example.com/')
    expect(siteBase('https://www.example.com/web//')).toBe('https://www.example.com/web/')
    expect(() => siteBase('www.example.com')).toThrow()
  })
})
