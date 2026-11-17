// Vizualizácie a letecké zábery pozemku nie sú v repozitári (podklady investora). Na webe
// však sú – tento skript ich pred zostavením stiahne z nasadenej stránky do priečinka
// web/public/vizualizacie, aby nové zostavenie (aj to automatické) malo stránku celú.
//
//   npm run visuals
//
// Stiahne len súbory, ktoré šablóna potrebuje a v priečinku chýbajú. Keď sa niektorý
// stiahnuť nepodarí, skončí chybou – zostavenie bez vizualizácií by zo stránky potichu
// vynechalo dve časti.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'web/public/vizualizacie')

const template = readFileSync(join(root, 'web/site.template.html'), 'utf8')
const names = [...new Set([...template.matchAll(/\/vizualizacie\/([A-Za-z0-9._-]+\.(?:webp|jpg|png))/g)].map((m) => m[1]))].sort()
const missing = names.filter((name) => !existsSync(join(dir, name)))
if (!missing.length) {
  console.log(`✓ Vizualizácie sú na mieste (${names.length} súborov).`)
  process.exit(0)
}

const env = readFileSync(join(root, '.env.web'), 'utf8')
const site = (process.env.VITE_SITE_URL ?? /^VITE_SITE_URL=(.+)$/m.exec(env)?.[1] ?? '').trim().replace(/\/*$/, '/')
if (!/^https:\/\/[^/\s]+\//.test(site)) {
  console.error('✗ Adresa webu (VITE_SITE_URL v .env.web) nie je nastavená – vizualizácie nie je odkiaľ stiahnuť.')
  process.exit(1)
}

mkdirSync(dir, { recursive: true })
let failed = 0
for (const name of missing) {
  try {
    const res = await fetch(`${site}vizualizacie/${name}`, { redirect: 'follow' })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) throw new Error(`odpoveď ${res.status} ${type}`.trim())
    const data = Buffer.from(await res.arrayBuffer())
    if (data.length < 1000) throw new Error('súbor je prázdny')
    writeFileSync(join(dir, name), data)
    console.log(`  ${name} (${Math.round(data.length / 1024)} kB)`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}: ${error instanceof Error ? error.message : error}`)
  }
}
if (failed) {
  console.error(`✗ ${failed} z ${missing.length} súborov sa nepodarilo stiahnuť z ${site} – skopírujte ich do web/public/vizualizacie ručne (README, časť Vizualizácie).`)
  process.exit(1)
}
console.log(`✓ Stiahnutých ${missing.length} súborov z ${site}.`)
