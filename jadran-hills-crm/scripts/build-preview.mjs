// Pripraví náhľad prezentačnej stránky na zverejnenie ako súkromná stránka na claude.ai.
//
// Vstupom je zostavený web (dist-web). Hostiteľ dokument obalí vlastnou kostrou a púšťa
// len súbory zverejnené spolu so stránkou, preto sa štýly a skript vkladajú priamo do
// stránky, písmo sa berie z Google Fonts a obrázky idú ako sprievodné súbory.
// Formulár je v náhľade vypnutý (hostiteľ neumožňuje volať cudzie servery).
//
//   PREVIEW_LOGIN_URL  kam vedie „Prihlásenie“ (predvolene ./crm/)
//   PREVIEW_ART        miestny súbor s čiarovou kresbou domu (inak sa časť s kresbou skryje)
//   PREVIEW_OUT        výstupný priečinok (predvolene dist-preview)

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist-web')
const out = resolve(process.env.PREVIEW_OUT ?? join(root, 'dist-preview'))
const loginUrl = process.env.PREVIEW_LOGIN_URL ?? './crm/'
const art = process.env.PREVIEW_ART

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const pick = (re, what) => {
  const m = html.match(re)
  if (!m) throw new Error(`Vo výstupe chýba ${what}`)
  return m[1]
}
const cssFile = pick(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/, 'štýl')
const jsFile = pick(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/, 'skript')

// Štýly: písmo dodá Google Fonts, vlastné súbory písma sa nepribaľujú.
const css = readFileSync(join(dist, cssFile), 'utf8').replace(/@font-face\s*\{[^}]*\}/g, '')
if (/url\((?!["']?data:)/.test(css)) throw new Error('Štýl odkazuje na súbor, ktorý náhľad nemá.')

// Skript: adresy obrázkov sú v zostavení relatívne k súboru skriptu; po vložení do stránky
// musia byť relatívne k stránke.
const js = readFileSync(join(dist, jsFile), 'utf8')
  // pomocný súbor pre staršie prehliadače náhľad nepotrebuje
  .replace(/import\s*["'`]\.\/modulepreload-polyfill-[^"'`]+["'`];?/g, '')
  .replace(/new URL\(`([^`]+)`,\s*import\.meta\.url\)\.href/g, (_, f) => JSON.stringify(`assets/${f}`))
  .replace(/new URL\("([^"]+)",\s*import\.meta\.url\)\.href/g, (_, f) => JSON.stringify(`assets/${f}`))
if (js.includes('import.meta.url')) throw new Error('V skripte ostal odkaz relatívny k súboru skriptu.')
if (/(^|[;}\s])import\s*["'`({]/.test(js) || /\bfrom\s*["'`]\.\//.test(js)) throw new Error('Skript sa odvoláva na ďalší súbor – náhľad ho nemá.')

let body = pick(/<body[^>]*>([\s\S]*)<\/body>/, 'obsah stránky')
  .replace(/<script type="module"[^>]*><\/script>/g, '')
  .replace(/href="\.\/crm\/"/g, `href="${loginUrl}" target="_blank" rel="noopener"`)
  .replace('<form class="form" data-form', '<form class="form" data-form data-preview')
  .replace(/(src|srcset)="([^"]*)"/g, (_, attr, value) => `${attr}="${value.replaceAll('./assets/', 'assets/')}"`)
if (art && existsSync(art)) {
  body = body.replace(/--art: url\('[^']*'\)/, `--art: url('assets/${basename(art)}')`)
}
body = body.replace(
  '<p class="copy">',
  '<p class="fine">Toto je náhľad stránky: formulár sa neodosiela a Prihlásenie vedie do súkromného CRM.</p>\n        <p class="copy">',
)

const title = 'Jadran Hills web'
const page = [
  `<title>${title}</title>`,
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap">',
  `<style>${css}</style>`,
  "<script>document.documentElement.classList.add('js')</script>",
  body.trim(),
  `<script type="module">${js}</script>`,
  '',
].join('\n')

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'assets'), { recursive: true })
writeFileSync(join(out, 'jadran-hills-web.html'), page)

// Sprievodné súbory: len obrázky, na ktoré stránka naozaj odkazuje.
const used = new Set([...page.matchAll(/assets\/([A-Za-z0-9._-]+\.(?:webp|jpg|png|svg))/g)].map((m) => m[1]))
const files = {}
for (const f of readdirSync(join(dist, 'assets'))) {
  if (!used.has(f)) continue
  copyFileSync(join(dist, 'assets', f), join(out, 'assets', f))
  files[`assets/${f}`] = `assets/${f}`
}
if (art && existsSync(art)) {
  copyFileSync(art, join(out, 'assets', basename(art)))
  files[`assets/${basename(art)}`] = `assets/${basename(art)}`
}
const missing = [...used].filter((f) => !files[`assets/${f}`])
if (missing.length) throw new Error(`Stránka odkazuje na chýbajúce obrázky: ${missing.join(', ')}`)
writeFileSync(join(out, 'files.json'), JSON.stringify(files, null, 2))
console.log(`Náhľad pripravený: ${join(out, 'jadran-hills-web.html')} (${Math.round(page.length / 1024)} kB) + ${Object.keys(files).length} obrázkov`)
