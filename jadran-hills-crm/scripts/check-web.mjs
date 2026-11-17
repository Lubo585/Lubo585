// Kontrola zostaveného verejného webu (dist-web) pred nasadením.
//
// Web je verejný a repozitár tiež – do výstupu sa nesmie dostať nič zo súkromného
// priečinka. Skript navyše overí, že stránky sú úplné a prezentačná stránka ostala ľahká.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist-web')
const fail = (text) => {
  console.error(`✗ ${text}`)
  process.exit(1)
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else files.push(path)
  }
}
if (!existsSync(dist)) fail('Priečinok dist-web neexistuje – najprv spustite zostavenie.')
walk(dist)

// Prezentačná stránka v každom jazyku (slovenská je na úvodnej adrese) a aplikácia.
const langs = ['sk', 'en', 'hr', 'de', 'hu']
const sitePage = (lang) => (lang === 'sk' ? 'index.html' : `${lang}/index.html`)
const need = [...langs.map(sitePage), 'crm/index.html', 'robots.txt', 'favicon.svg', '.htaccess', 'notify.php']
for (const f of need) if (!existsSync(join(dist, f))) fail(`Vo výstupe chýba ${f}.`)

const text = (path) => readFileSync(path, 'utf8')
const textual = files.filter((f) => ['.html', '.js', '.css', '.svg', '.txt', '.json', '.php'].includes(extname(f)))

// 1. Adresa a kľúč projektu Supabase musia byť doplnené.
for (const f of [...langs.map(sitePage), 'crm/index.html']) {
  if (text(join(dist, f)).includes('%VITE_')) fail(`${f}: chýba nastavenie Supabase (súbor .env.web).`)
}

// 2. Nič zo súkromných podkladov projektu.
const privateDir = join(root, 'private')
if (existsSync(privateDir)) {
  const secrets = new Set()
  for (const f of readdirSync(privateDir).filter((n) => n.endsWith('.params.json'))) {
    const p = JSON.parse(text(join(privateDir, f)))
    const add = (v) => typeof v === 'string' && v.trim().length >= 6 && secrets.add(v.trim())
    add(p.project?.investor)
    add(p.project?.investorId)
    add(p.project?.investorAddress)
    add(p.project?.cadastral)
    for (const c of p.contacts ?? []) {
      add(c.email)
      add(c.phone)
      add(c.name)
    }
    for (const b of p.buildings ?? []) add(b.designRef)
    for (const d of p.documents ?? []) add(d.url)
  }
  const media = existsSync(join(privateDir, 'media')) ? readdirSync(join(privateDir, 'media')) : []
  for (const f of textual) {
    const body = text(f)
    for (const s of secrets) if (body.includes(s)) fail(`${relative(dist, f)} obsahuje súkromný údaj projektu – zostavenie zastavené.`)
  }
  const names = new Set(files.map((f) => f.slice(f.lastIndexOf('/') + 1)))
  for (const m of media) {
    const stem = m.slice(0, m.lastIndexOf('.'))
    if ([...names].some((n) => n.startsWith(`${stem}-`) || n === m)) fail(`Vo výstupe je súkromný obrázok ${m}.`)
  }
}

// 3. Každá jazyková verzia je celá, hlási svoj jazyk, vedie na ostatné a neťahá kód aplikácie.
const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>/
let landingJs = 0
for (const lang of langs) {
  const file = sitePage(lang)
  const page = text(join(dist, file))
  if (!page.includes(`<html lang="${lang}">`)) fail(`${file}: stránka nehlási jazyk „${lang}“.`)
  if (page.includes('{{')) fail(`${file}: v stránke ostala nevyplnená značka šablóny.`)
  for (const to of langs) if (!page.includes(`data-lang-link="${to}"`)) fail(`${file}: chýba odkaz na jazyk „${to}“.`)
  const scripts = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.includes('assets/'))
  const size = scripts.reduce((sum, s) => sum + statSync(join(dist, dirname(file), s)).size, 0)
  if (size > 60_000) fail(`${file}: skript stránky má ${Math.round(size / 1024)} kB – pribalil sa doň kód aplikácie?`)
  if (inlineScript.test(page)) fail(`${file}: stránka obsahuje vložený skript – bezpečnostné pravidlá stránky (CSP) ho nespustia.`)
  landingJs = Math.max(landingJs, size)
}
if (inlineScript.test(text(join(dist, 'crm/index.html')))) {
  fail('crm/index.html: stránka obsahuje vložený skript – bezpečnostné pravidlá stránky (CSP) ho nespustia.')
}

// 4. Vizualizácie nie sú v repozitári – stránka zostavená bez nich má o dve časti menej.
const visuals = text(join(dist, 'index.html')).includes('id="vizualizacie"')
if (!visuals) console.warn('! Stránka je zostavená BEZ vizualizácií (priečinok web/public/vizualizacie je prázdny) – pozri README.')

const total = files.reduce((sum, f) => sum + statSync(f).size, 0)
console.log(
  `✓ Web je pripravený v dist-web: ${files.length} súborov, ${(total / 1048576).toFixed(1)} MB; prezentačná stránka v ${langs.length} jazykoch${visuals ? ' s vizualizáciami' : ''}, jej skript ${Math.round(landingJs / 1024)} kB.`,
)
