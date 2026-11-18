// Nahrá zostavený web do webového priečinka hostingu cez jeho webového správcu súborov
// (Monsta FTP na webftp.*). Je to náhradná cesta pre prostredie, z ktorého sa na hosting
// nedá pripojiť cez FTP ani SFTP; bežne web nahráva workflow deploy-jadran-hills.yml.
//
//   JH_WEBFTP_LINK_FILE=<súbor s odkazom> node scripts/upload-webftp.cjs dist-web <výstup> <krok…>
//
//   kroky:  dir:<priečinok>        nahrá celý priečinok z dist-web
//           files:<a,b,c>          nahrá súbory z koreňa dist-web
//           in:<priečinok>:<a,b>   nahrá súbory z dist-web/<priečinok> do rovnakého priečinka na hostingu
//           list                   vypíše obsah webového priečinka (aj podpriečinkov)
//           up:<miestny súbor>     nahrá súbor o priečinok vyššie než web (mimo dosahu prehliadača),
//                                  napr. nastavenie e-mailu o novom dopyte jh-notify.config.php
//           uplist                 vypíše obsah priečinka o úroveň vyššie
//
// Odkaz do správcu súborov obsahuje prístupové údaje: číta sa zo súboru mimo repozitára
// a nikam sa nevypisuje. Skript potrebuje balík playwright s prehliadačom Chromium.
const { chromium } = require('playwright')
const fs = require('fs'); const path = require('path')
if (!process.env.JH_WEBFTP_LINK_FILE) {
  console.error('Chýba JH_WEBFTP_LINK_FILE – cesta k súboru s odkazom do správcu súborov.')
  process.exit(2)
}
const link = fs.readFileSync(process.env.JH_WEBFTP_LINK_FILE, 'utf8').trim()
const [,, distArg, outDir, ...steps] = process.argv
const dist = path.resolve(distArg)
const WEB = ['jadranhills.com', 'web']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hide = (s) => String(s).replace(/eyJ[A-Za-z0-9+/=_-]{20,}/g, '‹prístup›')

;(async () => {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {})
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'sk-SK' })
  const page = await ctx.newPage()
  let pending = 0; let uploads = 0; const failures = []; const actions = {}
  const isApi = (u) => /\/application\/api\/(api|upload)\.php/.test(u)
  page.on('request', (r) => {
    if (!isApi(r.url())) return
    pending++
    let action = /upload\.php/.test(r.url()) ? 'upload' : '?'
    try { const m = /actionName%22%3A%22([A-Za-z]+)|"actionName":"([A-Za-z]+)"/.exec(r.postData() || ''); if (m) action = m[1] || m[2] } catch {}
    actions[action] = (actions[action] || 0) + 1
    if (action === 'upload') uploads++
  })
  const done = async (r, failed) => {
    if (!isApi(r.url())) return
    pending--
    if (failed) { failures.push('spojenie zlyhalo: ' + r.url().replace(/^https:\/\/[^/]+/, '')); return }
  }
  page.on('requestfinished', (r) => done(r, false))
  page.on('requestfailed', (r) => done(r, true))
  page.on('response', async (r) => {
    if (!isApi(r.url())) return
    let body = ''
    try { body = await r.text() } catch {}
    if (r.status() >= 400 || /"success":false|"errors"/.test(body)) failures.push(`${r.status()} ${hide(body.slice(0, 300))}`)
  })
  page.on('pageerror', (e) => failures.push('pageerror ' + hide(String(e).slice(0, 200))))
  const idle = async (quiet = 2500, max = 600000) => {
    const t0 = Date.now(); let since = Date.now()
    while (Date.now() - t0 < max) {
      if (pending > 0) since = Date.now()
      if (Date.now() - since > quiet) return true
      await sleep(250)
    }
    return false
  }
  const rows = () => page.evaluate(() => [...document.querySelectorAll('tr.context-catcher-tr')].map((tr) => ({
    dir: !!tr.querySelector('td.icon .fa-folder'), name: tr.querySelector('.file-wrapper span')?.textContent.trim(), size: tr.querySelector('td.size span')?.textContent.trim() ?? '',
  })))
  const open = async (name) => {
    await page.locator('tr.context-catcher-tr .file-wrapper span', { hasText: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click()
    await idle(1500)
  }
  // Pri nahrávaní súboru, ktorý na hostingu už je, sa správca pýta: „Upload and Replace“ / „Keep Remote File“.
  const confirm = async () => {
    let n = 0
    for (let i = 0; i < 60; i++) {
      const replace = page.locator('#modal-choice.in button', { hasText: 'Upload and Replace' })
      if (await replace.isVisible().catch(() => false)) {
        const title = (await page.locator('#modal-choice').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(2, 60)
        console.log('  potvrdené prepísanie:', title)
        await replace.click(); n++; await sleep(900)
      } else if (n > 0 || i > 8) break
      else await sleep(350)
    }
    return n
  }
  const modal = () => page.evaluate(() => [...document.querySelectorAll('.modal.in, .modal.show, .modal[style*="display: block"]')].map((m) => m.innerText.replace(/\s+/g, ' ').slice(0, 300)))

  await page.goto(link, { waitUntil: 'load' })
  await page.waitForSelector('tr.context-catcher-tr', { timeout: 60000 }); await idle(1500)
  for (const d of WEB) await open(d)
  const start = await rows()
  console.log('webový priečinok na začiatku:', start.map((r) => (r.dir ? r.name + '/' : r.name)).join(', '))
  if (!start.some((r) => r.name === 'index.php') && !start.some((r) => r.name === 'index.html')) throw new Error('Toto nevyzerá ako webový priečinok domény – končím bez zmien.')

  for (const step of steps) {
    const [kind, arg] = step.split(':')
    const before = uploads
    if (kind === 'dir') {
      const local = path.join(dist, arg)
      const n = fs.readdirSync(local, { recursive: true }).filter((f) => fs.statSync(path.join(local, f)).isFile()).length
      await page.setInputFiles('#upload-folder-placeholder', local)
      await sleep(1500)
      const m = await modal(); if (m.length) console.log(`  okno po výbere (${arg}):`, hide(m.join(' | ')))
      const okay = await idle(3000)
      console.log(`priečinok ${arg}: ${n} súborov miestne, odoslaných požiadaviek ${uploads - before}${okay ? '' : ' (čakanie vypršalo)'}`)
    } else if (kind === 'files' || kind === 'in') {
      const [dir, names] = kind === 'in' ? [arg, step.split(':')[2]] : ['', arg]
      const list = names.split(',').map((f) => path.join(dist, dir, f))
      for (const f of list) if (!fs.existsSync(f)) throw new Error('Chýba miestny súbor ' + f)
      if (dir) await open(dir)
      await page.setInputFiles('#upload-placeholder', list)
      const confirmed = await confirm()
      const okay = await idle(3000)
      console.log(`súbory ${dir ? dir + '/' : ''}${names}: odoslaných požiadaviek ${uploads - before}, potvrdení prepísania ${confirmed}${okay ? '' : ' (čakanie vypršalo)'}`)
      if (dir) { await page.click('button[title="Back"]'); await idle(1500) }
    } else if (kind === 'uplist' || kind === 'up') {
      // O priečinok vyššie než web (priečinok domény, mimo dosahu prehliadača).
      await page.click('button[title="Back"]'); await idle(1500)
      const here = await rows()
      if (!here.some((r) => r.dir && r.name === 'web')) throw new Error('O priečinok vyššie nie je priečinok web – končím bez zmien.')
      if (kind === 'up') {
        const local = path.resolve(arg)
        if (!fs.existsSync(local)) throw new Error('Chýba miestny súbor ' + local)
        await page.setInputFiles('#upload-placeholder', [local])
        const confirmed = await confirm()
        const okay = await idle(3000)
        console.log(`súbor ${path.basename(local)} o priečinok vyššie: odoslaných požiadaviek ${uploads - before}, potvrdení prepísania ${confirmed}${okay ? '' : ' (čakanie vypršalo)'}`)
        await page.click('button[title="Refresh"]'); await idle(1500)
      }
      const after = await rows()
      console.log('priečinok domény:', after.map((r) => (r.dir ? r.name + '/' : `${r.name} ${r.size}`)).join(', '))
      await open('web')
    } else if (kind === 'list') {
      await page.click('button[title="Refresh"]'); await idle(1500)
      const top = await rows()
      console.log('webový priečinok:')
      for (const r of top) console.log(`  ${r.dir ? 'd' : '-'} ${r.name}  ${r.size}`)
      for (const r of top.filter((x) => x.dir)) {
        await open(r.name)
        const inner = await rows()
        console.log(`  ${r.name}/ (${inner.length}): ` + inner.map((x) => `${x.name} ${x.size}`).join(', ').slice(0, 2400))
        await page.click('button[title="Back"]'); await idle(1500)
      }
    }
    await page.screenshot({ path: path.join(outDir, `upload-${step.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.png`) })
    const m = await modal(); if (m.length) console.log('  otvorené okno:', hide(m.join(' | ')))
  }
  console.log('volania:', JSON.stringify(actions))
  console.log(failures.length ? 'ZLYHANIA:\n' + [...new Set(failures)].slice(0, 12).join('\n') : 'bez zlyhaní')
  await browser.close()
})().catch((e) => { console.error('CRASH', hide(String(e).slice(0, 800))); process.exit(2) })
