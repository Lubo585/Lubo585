// Jazykové verzie prezentačnej stránky.
//
// Stránka má jednu šablónu (web/site.template.html) a pre každý jazyk slovník
// (web/i18n/<kód>.json). Pri zostavení z nich vznikne samostatná stránka pre každý jazyk:
// slovenská na adrese /, ostatné na /en/, /hr/, /de/ a /hu/. Texty sú tak priamo v HTML –
// stránka sa dá čítať aj bez skriptu a vyhľadávače vidia každú jazykovú verziu.
//
// Tento súbor nepoužíva nič z prehliadača ani z Node: volá ho zostavenie (vite.config.ts)
// aj testy.

export const LANGS = [
  { code: 'sk', name: 'Slovenčina', dir: '' },
  { code: 'en', name: 'English', dir: 'en/' },
  { code: 'hr', name: 'Hrvatski', dir: 'hr/' },
  { code: 'de', name: 'Deutsch', dir: 'de/' },
  { code: 'hu', name: 'Magyar', dir: 'hu/' },
] as const

export type Lang = (typeof LANGS)[number]
export type LangCode = Lang['code']
export type Dict = Record<string, string>
export type Dicts = Record<LangCode, Dict>

/** Jazyk, v ktorom sa stránka píše; ostatné slovníky musia mať presne jeho kľúče. */
export const BASE_LANG: LangCode = 'sk'

export const isLang = (code: string): code is LangCode => LANGS.some((l) => l.code === code)

/** Kľúče, ktoré šablóna nepoužíva priamo – vkladá ich zostavenie k odkazom na jazyky. */
const HINT_KEYS = ['js.suggest.text', 'js.suggest.go', 'js.suggest.close'] as const

const PLACEHOLDER = /\{\{(@?[A-Za-z0-9_.]+)\}\}/g

// Podmienené časti šablóny: {{#názov}}…{{/názov}} ostane, ak je vlastnosť zapnutá,
// {{^názov}}…{{/názov}} naopak, ak zapnutá nie je. Časti sa môžu vnárať; výraz nižšie
// nájde vždy tú najvnútornejšiu (bez ďalšej značky časti vnútri).
const BLOCK = /\{\{([#^])([A-Za-z]+)\}\}((?:(?!\{\{[#^/][A-Za-z]+\}\})[\s\S])*?)\{\{\/\2\}\}/g
const BLOCK_MARK = /\{\{[#^/][A-Za-z]+\}\}/
/** Značka časti na samostatnom riadku po sebe nenechá prázdny riadok. */
const BLOCK_LINE = /^[ \t]*(\{\{[#^/][A-Za-z]+\}\})[ \t]*\r?\n/gm

/** Súbory vizualizácií, na ktoré šablóna odkazuje (ležia vo web/public/vizualizacie). */
const VISUAL_FILE = /\/vizualizacie\/([A-Za-z0-9._-]+\.(?:webp|jpg|png))/g

const escapeHtml = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/** Čísla v texte bez ohľadu na to, či jazyk píše desatinnú čiarku alebo bodku. */
const numbers = (text: string): string =>
  (text.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((n) => n.replace(',', '.'))
    .sort()
    .join(' ')

/** Kľúče slovníka, ktoré šablóna používa. */
export function templateKeys(template: string): string[] {
  const keys = new Set<string>()
  for (const m of template.matchAll(PLACEHOLDER)) if (!m[1].startsWith('@')) keys.add(m[1])
  return [...keys]
}

/** Názvy súborov vizualizácií, ktoré šablóna potrebuje. */
export function visualFiles(template: string): string[] {
  return [...new Set([...template.matchAll(VISUAL_FILE)].map((m) => m[1]))].sort()
}

/** Vyberie zo šablóny časti podľa zapnutých vlastností stránky. */
export function applyBlocks(template: string, flags: Record<string, boolean>): string {
  let out = template.replace(BLOCK_LINE, '$1')
  // Najprv najvnútornejšie časti, potom tie okolo nich – kým je čo vyberať.
  for (let before = ''; before !== out; ) {
    before = out
    out = out.replace(BLOCK, (_, kind: string, name: string, body: string) => {
      if (!(name in flags)) throw new Error(`Šablóna používa neznámu časť {{${kind}${name}}}.`)
      return flags[name] === (kind === '#') ? body : ''
    })
  }
  const stray = BLOCK_MARK.exec(out)
  if (stray) throw new Error(`Šablóna má neuzavretú časť ${stray[0]}.`)
  return out
}

/**
 * Vizualizácia domov zasadených do leteckého záberu (súbory poloha-*) je voliteľná: bez nej
 * blok Poloha ukáže len skutočné zábery pozemku. Ostatné súbory idú vždy spolu.
 */
export const isOptionalVisual = (name: string): boolean => name.startsWith('poloha-')

/**
 * Skontroluje slovníky voči šablóne a slovenskému originálu. Vráti zoznam nedostatkov;
 * prázdny zoznam znamená, že stránky možno zostaviť.
 */
export function checkDicts(template: string, dicts: Dicts): string[] {
  const problems: string[] = []
  const base = dicts[BASE_LANG]
  const used = new Set([...templateKeys(template), ...HINT_KEYS])
  for (const key of used) if (!(key in base)) problems.push(`${BASE_LANG}: chýba text „${key}“, ktorý šablóna používa`)
  for (const key of Object.keys(base)) if (!used.has(key)) problems.push(`${BASE_LANG}: text „${key}“ šablóna nepoužíva`)

  for (const { code } of LANGS) {
    const dict = dicts[code]
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== 'string' || value.trim() === '') problems.push(`${code}: text „${key}“ je prázdny`)
      else if (value !== value.trim()) problems.push(`${code}: text „${key}“ začína alebo končí medzerou`)
      else if (value.includes('{{')) problems.push(`${code}: text „${key}“ obsahuje značku šablóny`)
    }
    if (code === BASE_LANG) continue
    for (const key of Object.keys(base)) {
      if (!(key in dict)) problems.push(`${code}: chýba preklad „${key}“`)
      // Výmery, počty a vzdialenosti musia sedieť s originálom.
      else if (numbers(dict[key]) !== numbers(base[key])) problems.push(`${code}: „${key}“ má iné čísla než slovenský text`)
    }
    for (const key of Object.keys(dict)) if (!(key in base)) problems.push(`${code}: preklad „${key}“ nemá slovenský originál`)
  }
  return problems
}

/** Adresa webu v jednotnom tvare so záverečnou lomkou; prázdna, ak nie je nastavená. */
export function siteBase(url: string | undefined): string {
  const value = url?.trim() ?? ''
  if (!value) return ''
  if (!/^https?:\/\/[^/\s]+/.test(value)) throw new Error(`Adresa webu musí byť úplná (https://…), nie „${value}“.`)
  return value.replace(/\/*$/, '/')
}

/** Kontaktný e-mail v jednotnom tvare; prázdny, ak nie je nastavený. */
export function contactEmail(value: string | undefined): string {
  const email = value?.trim() ?? ''
  if (!email) return ''
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(email)) throw new Error(`Kontaktný e-mail nevyzerá ako adresa: „${email}“.`)
  return email
}

export interface PageOptions {
  /** Úplná adresa webu so záverečnou lomkou (napr. https://www.priklad.sk/). Bez nej sa
   *  odkazy na jazykové verzie pre vyhľadávače nevkladajú – tie musia byť úplné. */
  siteUrl?: string
  /** Kontaktný e-mail zobrazený na stránke. Bez neho stránka odkazuje len na formulár. */
  email?: string
  /** Či sú pri zostavení k dispozícii vizualizácie a letecké zábery pozemku. Bez nich sa
   *  časti stránky, ktoré ich ukazujú, vynechajú. */
  visuals?: boolean
  /** Či je medzi nimi aj vizualizácia domov v leteckom zábere (pozri isOptionalVisual). */
  montage?: boolean
}

/** Zloží stránku v danom jazyku. */
export function renderPage(template: string, lang: LangCode, dicts: Dicts, options: PageOptions = {}): string {
  const me = LANGS.find((l) => l.code === lang)
  if (!me) throw new Error(`Neznámy jazyk stránky: ${lang}`)
  const dict = dicts[lang]
  // Stránky ostatných jazykov ležia o priečinok hlbšie.
  const root = me.dir ? '../' : './'
  const src = me.dir ? '../../src/' : '../src/'
  const text = (key: string, from: Dict = dict): string => {
    const value = from[key]
    if (typeof value !== 'string') throw new Error(`V slovníku ${lang} chýba text „${key}“.`)
    return escapeHtml(value)
  }
  const href = (to: Lang): string => `${root}${to.dir}`
  const current = (to: Lang): string => (to.code === lang ? ' aria-current="true"' : '')

  const langList = LANGS.map((to) => {
    const own = dicts[to.code]
    const hint = `data-suggest="${text('js.suggest.text', own)}" data-go="${text('js.suggest.go', own)}" data-close="${text('js.suggest.close', own)}"`
    return `              <li><a href="${href(to)}" hreflang="${to.code}" lang="${to.code}" data-lang-link="${to.code}" ${hint}${current(to)}><span>${to.name}</span><svg class="i" aria-hidden="true"><use href="#i-check" /></svg></a></li>`
  }).join('\n')

  const langPills = LANGS.map(
    (to) => `        <a href="${href(to)}" hreflang="${to.code}" lang="${to.code}" data-lang-link="${to.code}"${current(to)}>${to.name}</a>`,
  ).join('\n')

  const site = siteBase(options.siteUrl)
  const alternates = site
    ? [
        `    <link rel="canonical" href="${site}${me.dir}" />`,
        ...LANGS.map((to) => `    <link rel="alternate" hreflang="${to.code}" href="${site}${to.dir}" />`),
        `    <link rel="alternate" hreflang="x-default" href="${site}" />`,
        `    <meta property="og:url" content="${site}${me.dir}" />`,
        ...LANGS.filter((to) => to.code !== lang).map(
          (to) => `    <meta property="og:locale:alternate" content="${text('meta.locale', dicts[to.code])}" />`,
        ),
        '',
      ].join('\n')
    : ''

  const email = contactEmail(options.email)
  const special: Record<string, string> = {
    '@email': escapeHtml(email),
    '@lang': lang,
    '@langCode': lang.toUpperCase(),
    '@langName': me.name,
    '@langList': langList,
    '@langPills': langPills,
    '@alternates': alternates,
    '@root': root,
    '@src': src,
  }

  const visuals = options.visuals === true
  const body = applyBlocks(template, { email: email !== '', visuals, montage: visuals && options.montage === true })
  return body.replace(PLACEHOLDER, (_, key: string) => {
    if (!key.startsWith('@')) return text(key)
    if (!(key in special)) throw new Error(`Šablóna používa neznámu značku {{${key}}}.`)
    return special[key]
  })
}
