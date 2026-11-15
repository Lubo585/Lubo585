// Pripraví stránku na zverejnenie u hostiteľa (claude.ai).
//
// Hostiteľ si dokument obalí vlastnou kostrou (doctype, head, body), preto sa
// publikuje len obsah: názov, štýly, koreňový prvok a skript. Vstupom je výstup
// `vite build --mode artifact` (jeden súbor bez súkromných dát).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'dist-artifact', 'index.html')
const out = join(root, 'dist-artifact', 'page.html')

const html = readFileSync(src, 'utf8')
const pick = (re, what) => {
  const m = html.match(re)
  if (!m) throw new Error(`Vo výstupe chýba ${what}`)
  return m[1]
}

const title = pick(/<title>([^<]*)<\/title>/, 'názov stránky')
const style = pick(/<style[^>]*>([\s\S]*?)<\/style>/, 'štýl')
const script = pick(/<script type="module"[^>]*>([\s\S]*?)<\/script>/, 'skript aplikácie')

// Kontrola dôvernosti: nič zo súkromných parametrov projektu nesmie byť v stránke.
const privateDir = join(root, 'private')
if (existsSync(privateDir)) {
  for (const f of readdirSync(privateDir).filter((n) => n.endsWith('.params.json'))) {
    const p = JSON.parse(readFileSync(join(privateDir, f), 'utf8'))
    const secrets = [p.project?.investor, p.project?.investorId, p.project?.investorAddress, ...(p.contacts ?? []).map((c) => c.email)]
      .filter((v) => typeof v === 'string' && v.length >= 6)
    const leaked = secrets.filter((v) => html.includes(v))
    if (leaked.length) throw new Error(`Stránka obsahuje súkromné údaje projektu (${leaked.length}×) – zostavenie zastavené.`)
  }
}

// Obrázky projektu patria do úložiska stránky, nie do jej kódu.
if (/data:image\/(png|jpe?g|webp);base64,/.test(html) || html.length > 1_200_000) {
  throw new Error('Stránka obsahuje vložené obrázky alebo je nečakane veľká – zostavenie zastavené.')
}

const page = [
  `<title>${title}</title>`,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
  `<style>${style}</style>`,
  '<div id="root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n')

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, page)
console.log(`Stránka pripravená: ${out} (${Math.round(page.length / 1024)} kB)`)
