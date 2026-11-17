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

const need = ['index.html', 'crm/index.html', 'robots.txt', 'favicon.svg', '.htaccess']
for (const f of need) if (!existsSync(join(dist, f))) fail(`Vo výstupe chýba ${f}.`)

const text = (path) => readFileSync(path, 'utf8')
const textual = files.filter((f) => ['.html', '.js', '.css', '.svg', '.txt', '.json'].includes(extname(f)))

// 1. Adresa a kľúč projektu Supabase musia byť doplnené.
for (const f of ['index.html', 'crm/index.html']) {
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

// 3. Prezentačná stránka nesmie ťahať kód aplikácie.
const landing = text(join(dist, 'index.html'))
const scripts = [...landing.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.includes('assets/'))
const landingJs = scripts.reduce((sum, s) => sum + statSync(join(dist, s)).size, 0)
if (landingJs > 60_000) fail(`Skript prezentačnej stránky má ${Math.round(landingJs / 1024)} kB – pribalil sa doň kód aplikácie?`)
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(landing) || /<script(?![^>]*\bsrc=)[^>]*>/.test(text(join(dist, 'crm/index.html')))) {
  fail('Stránka obsahuje vložený skript – bezpečnostné pravidlá stránky (CSP) ho nespustia.')
}

const total = files.reduce((sum, f) => sum + statSync(f).size, 0)
console.log(`✓ Web je pripravený v dist-web: ${files.length} súborov, ${(total / 1048576).toFixed(1)} MB; skript prezentačnej stránky ${Math.round(landingJs / 1024)} kB.`)
