/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { LANGS, checkDicts, contactEmail, isLang, renderPage, siteBase, visualFiles, type Dicts } from './src/site/pages.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Jazykové verzie prezentačnej stránky. Súbory web/index.html, web/en/index.html, … sú len
 * značky s kódom jazyka; obsah sa pri každom načítaní či zostavení skladá zo šablóny
 * web/site.template.html a slovníka web/i18n/<kód>.json (pozri src/site/pages.ts).
 *
 * Vizualizácie a letecké zábery pozemku (web/public/vizualizacie) nie sú v repozitári. Ak pri
 * zostavení v priečinku sú, stránka ich ukáže; ak nie, časti stránky s nimi sa vynechajú.
 */
function sitePages(siteUrl: string | undefined, email: string | undefined): Plugin[] {
  contactEmail(email)
  const visualsDir = resolve(root, 'web/public/vizualizacie')
  const templateFile = resolve(root, 'web/site.template.html')
  const dictFile = (code: string) => resolve(root, `web/i18n/${code}.json`)
  const sources = [templateFile, ...LANGS.map((l) => dictFile(l.code))]
  const load = () => {
    const template = readFileSync(templateFile, 'utf8')
    const dicts = Object.fromEntries(LANGS.map((l) => [l.code, JSON.parse(readFileSync(dictFile(l.code), 'utf8'))])) as Dicts
    const problems = checkDicts(template, dicts)
    if (problems.length) throw new Error(`Slovníky prezentačnej stránky nie sú úplné:\n  ${problems.join('\n  ')}`)
    const wanted = visualFiles(template)
    const missing = wanted.filter((name) => !existsSync(resolve(visualsDir, name)))
    // Polovičná sada by na stránke nechala prázdne rámy.
    if (missing.length && missing.length < wanted.length) {
      throw new Error(`V priečinku web/public/vizualizacie chýbajú súbory: ${missing.join(', ')}`)
    }
    return { template, dicts, visuals: wanted.length > 0 && missing.length === 0 }
  }
  const pages: Plugin = {
    name: 'jadran-hills:site-pages',
    // Neúplný preklad zastaví zostavenie hneď na začiatku.
    buildStart() {
      load()
      for (const file of sources) this.addWatchFile(file)
    },
    configureServer(server) {
      server.watcher.add(sources)
      server.watcher.on('change', (file) => {
        if (sources.includes(resolve(file))) server.hot.send({ type: 'full-reload' })
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const lang = /<html[^>]*\bdata-site-page="([a-z]+)"/.exec(html)?.[1]
        if (!lang) return html
        if (!isLang(lang)) throw new Error(`Neznámy jazyk stránky: ${lang}`)
        const { template, dicts, visuals } = load()
        return renderPage(template, lang, dicts, { siteUrl, email, visuals })
      },
    },
  }
  // Obrázok pre náhľad odkazu (sociálne siete, správy) musí mať úplnú adresu; tú stránka
  // pozná až na konci zostavenia, keď má obrázok konečný názov.
  const site = siteBase(siteUrl)
  const absoluteOgImage: Plugin = {
    name: 'jadran-hills:site-og-image',
    enforce: 'post',
    generateBundle(_, bundle) {
      if (!site) return
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.html')) continue
        file.source = String(file.source).replace(/(<meta property="og:image" content=")(?:\.\.?\/)+/, `$1${site}`)
      }
    },
  }
  return [pages, absoluteOgImage]
}

// `vite build --mode single` zabalí celú aplikáciu do jedného HTML súboru
// (dist-single/index.html) – dá sa otvoriť priamo z disku alebo poslať e-mailom.
// `vite build --mode artifact` robí to isté bez súkromných dát; z výsledku potom
// scripts/build-artifact.mjs pripraví stránku na zverejnenie u hostiteľa.
// `vite build --mode web` zostaví verejný web (dist-web): prezentačnú stránku projektu
// v piatich jazykoch a pod adresou /crm/ aplikáciu s vlastným prihlásením nad databázou
// Supabase.
export default defineConfig(({ mode }) => {
  const test = { environment: 'node' as const, include: ['src/**/*.test.ts', 'private/**/*.test.ts'] }

  if (mode === 'web') {
    // Úplná adresa webu (VITE_SITE_URL) je potrebná len na odkazy pre vyhľadávače;
    // kontaktný e-mail (VITE_CONTACT_EMAIL) sa zobrazí pri formulári a v pätičke.
    const env = loadEnv(mode, root)
    const siteUrl = env.VITE_SITE_URL
    const email = env.VITE_CONTACT_EMAIL
    const sitePageFiles = Object.fromEntries(LANGS.map((l) => [l.dir ? l.code : 'index', resolve(root, `web/${l.dir}index.html`)]))
    return {
      root: resolve(root, 'web'),
      base: './',
      envDir: root,
      publicDir: resolve(root, 'web/public'),
      plugins: [...sitePages(siteUrl, email), react(), tailwindcss()],
      // Verejný web nesmie pribaliť nič zo súkromného priečinka – modul so súkromnými
      // východiskovými dátami sa nahrádza prázdnym.
      resolve: { alias: [{ find: /^(\.\.?\/)+data\/seed$/, replacement: resolve(root, 'src/data/seed.none.ts') }] },
      build: {
        outDir: resolve(root, 'dist-web'),
        emptyOutDir: true,
        chunkSizeWarningLimit: 900,
        rollupOptions: { input: { ...sitePageFiles, crm: resolve(root, 'web/crm/index.html') } },
      },
      server: { fs: { allow: [root] } },
      test,
    }
  }

  const oneFile = mode === 'single' || mode === 'artifact'
  return {
    base: './',
    plugins: [react(), tailwindcss(), ...(oneFile ? [viteSingleFile()] : [])],
    build: oneFile ? { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist-single' } : {},
    test,
  }
})
