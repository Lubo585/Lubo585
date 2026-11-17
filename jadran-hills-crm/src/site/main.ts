// Pohyb a ovládanie prezentačnej stránky. Obsah je v HTML a funguje aj bez tohto skriptu.

import './site.css'

const root = document.documentElement
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = <T extends Element = HTMLElement>(sel: string, from: ParentNode = document) => from.querySelector<T>(sel)
const $$ = <T extends Element = HTMLElement>(sel: string, from: ParentNode = document) => [...from.querySelectorAll<T>(sel)]
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

// ───────────────────────── Udalosti rolovania: jeden prepočet na snímku ─────────────────────────

const onFrame: (() => void)[] = []
let queued = false
function schedule(): void {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    for (const fn of onFrame) fn()
  })
}
window.addEventListener('scroll', schedule, { passive: true })
window.addEventListener('resize', schedule, { passive: true })

// ───────────────────────── Navigácia ─────────────────────────

function nav(): void {
  const bar = $('[data-nav]')
  if (!bar) return
  const dark = $$('[data-dark]')
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  const links = $$<HTMLAnchorElement>('.nav-links a')
  const sections = links.map((a) => document.getElementById(a.hash.slice(1)))
  onFrame.push(() => {
    const line = 28
    const isDark = dark.some((s) => {
      const r = s.getBoundingClientRect()
      return r.top <= line && r.bottom > line
    })
    const stuck = window.scrollY > 24
    bar.classList.toggle('is-stuck', stuck)
    bar.dataset.theme = isDark ? 'dark' : 'light'
    if (theme) theme.content = isDark ? '#0c2536' : '#ffffff'
    // zvýraznenie časti, ktorá je práve na obrazovke
    const mid = window.innerHeight * 0.4
    let here = -1
    sections.forEach((s, i) => {
      const r = s?.getBoundingClientRect()
      if (r && r.top <= mid && r.bottom > mid) here = i
    })
    links.forEach((a, i) => a.classList.toggle('is-here', i === here))
  })
}

function menu(): void {
  const sheet = $('[data-menu]')
  const open = $<HTMLButtonElement>('[data-menu-open]')
  const close = $<HTMLButtonElement>('[data-menu-close]')
  if (!sheet || !open || !close) return
  let timer = 0
  const set = (on: boolean) => {
    window.clearTimeout(timer)
    open.setAttribute('aria-expanded', String(on))
    document.body.style.overflow = on ? 'hidden' : ''
    if (on) {
      sheet.hidden = false
      requestAnimationFrame(() => sheet.classList.add('is-open'))
      close.focus()
    } else {
      sheet.classList.remove('is-open')
      timer = window.setTimeout(() => (sheet.hidden = true), reduced ? 0 : 360)
      open.focus()
    }
  }
  open.addEventListener('click', () => set(true))
  close.addEventListener('click', () => set(false))
  for (const a of $$('a', sheet)) a.addEventListener('click', () => set(false))
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) set(false)
  })
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860 && !sheet.hidden) set(false)
  })
}

// ───────────────────────── Úvod: striedanie záberov a posun pri rolovaní ─────────────────────────

const CAPTIONS = ['Sabunike · foto Fred Romero', 'Velebit zo Sabuník · foto Fred Romero', 'Zadar · foto Karl Paul Baldacchino']
const SLIDE_MS = 7000

// Ďalšie zábery úvodu sa načítavajú až po prvom; ich adresy pozná zostavenie stránky.
const HERO_FILES = import.meta.glob<string>('../../web/img/hero-*.webp', { eager: true, query: '?url', import: 'default' })

/** Adresy jedného záberu vo všetkých veľkostiach, napr. „hero-velebit“. */
function heroSources(name: string): { src: string; srcset: string } | null {
  const sizes: [number, string][] = []
  for (const [path, url] of Object.entries(HERO_FILES)) {
    const m = new RegExp(`/${name}-(\\d+)\\.webp$`).exec(path)
    if (m) sizes.push([Number(m[1]), url])
  }
  if (sizes.length === 0) return null
  sizes.sort((x, y) => x[0] - y[0])
  const mid = sizes[Math.min(1, sizes.length - 1)]
  return { src: mid[1], srcset: sizes.map(([w, url]) => `${url} ${w}w`).join(', ') }
}

function hero(): void {
  const el = $('[data-hero]')
  if (!el) return
  const slides = $$('[data-slide]', el)
  const dots = $$<HTMLButtonElement>('[data-dot]', el)
  const dotBox = dots[0]?.parentElement
  const caption = $('[data-hero-caption]', el)
  const media = $('.hero-media', el)
  const body = $('[data-hero-body]', el)
  let at = 0
  let timer = 0
  let visible = true

  const load = (slide: HTMLElement) => {
    const img = $<HTMLImageElement>('img', slide)
    if (!img || img.getAttribute('src') || !img.dataset.img) return
    const found = heroSources(img.dataset.img)
    if (!found) return
    img.srcset = found.srcset
    img.src = found.src
  }

  const show = (i: number) => {
    at = (i + slides.length) % slides.length
    load(slides[at])
    slides.forEach((s, k) => s.classList.toggle('is-on', k === at))
    dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === at)))
    if (caption) caption.textContent = CAPTIONS[at] ?? ''
    // ďalší záber sa pripraví vopred, aby prechod nezačal prázdnou plochou
    load(slides[(at + 1) % slides.length])
  }

  const stop = () => {
    window.clearTimeout(timer)
    dotBox?.removeAttribute('data-auto')
  }
  const play = () => {
    stop()
    if (reduced || !visible || document.hidden || slides.length < 2) return
    dotBox?.setAttribute('data-auto', '')
    dotBox?.style.setProperty('--slide-ms', `${SLIDE_MS}ms`)
    timer = window.setTimeout(() => {
      show(at + 1)
      play()
    }, SLIDE_MS)
  }

  dots.forEach((d, i) =>
    d.addEventListener('click', () => {
      show(i)
      play()
    }),
  )
  document.addEventListener('visibilitychange', play)
  // Ďalšie zábery sa načítajú až po prvom, aby nespomaľovali úvod.
  const start = () => {
    load(slides[1])
    play()
  }
  if (document.readyState === 'complete') window.setTimeout(start, 1200)
  else window.addEventListener('load', () => window.setTimeout(start, 1200), { once: true })

  onFrame.push(() => {
    const h = el.offsetHeight || 1
    const p = clamp(window.scrollY / h)
    const was = visible
    visible = p < 0.92
    if (visible !== was) play()
    if (reduced || !visible) return
    media?.style.setProperty('--hp', p.toFixed(4))
    body?.style.setProperty('--hp', p.toFixed(4))
  })
}

// ───────────────────────── Zobrazenie pri rolovaní ─────────────────────────

function reveal(): void {
  const items = $$('[data-reveal]')
  // Prvky v jednej skupine nabiehajú postupne.
  for (const group of $$('[data-stagger]')) {
    $$('[data-reveal]', group).forEach((el, i) => el.style.setProperty('--d', `${i * 0.09}s`))
  }
  for (const head of $$('.head, .contact-copy')) {
    $$('[data-reveal]', head).forEach((el, i) => el.style.setProperty('--d', `${i * 0.1}s`))
  }
  if (!('IntersectionObserver' in window)) {
    for (const el of items) el.classList.add('is-in')
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        e.target.dispatchEvent(new CustomEvent('revealed'))
        io.unobserve(e.target)
      }
    },
    { threshold: 0.14, rootMargin: '0px 0px -7% 0px' },
  )
  for (const el of items) io.observe(el)
  for (const el of $$('[data-elevation], [data-steps]')) io.observe(el)
}

/** Text, ktorý sa pri rolovaní postupne „rozsvecuje“ po slovách. */
function words(): void {
  const el = $('[data-words]')
  if (!el || reduced) return
  const text = el.textContent?.trim().split(/\s+/) ?? []
  el.setAttribute('aria-label', text.join(' '))
  el.textContent = ''
  const spans = text.map((word, i) => {
    const s = document.createElement('span')
    s.className = 'w'
    s.setAttribute('aria-hidden', 'true')
    s.textContent = word
    el.append(s, i < text.length - 1 ? ' ' : '')
    return s
  })
  let lit = -1
  onFrame.push(() => {
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.42))
    const n = Math.round(p * spans.length)
    if (n === lit) return
    lit = n
    spans.forEach((s, i) => s.classList.toggle('is-lit', i < n))
  })
}

function counters(): void {
  for (const el of $$('[data-count]')) {
    const target = Number(el.dataset.count)
    const host = el.closest('[data-reveal]')
    if (!host || reduced || !Number.isFinite(target)) continue
    el.textContent = '0'
    host.addEventListener(
      'revealed',
      () => {
        const t0 = performance.now()
        const ms = 1500 + Math.min(900, target * 30)
        const tick = (now: number) => {
          const p = clamp((now - t0) / ms)
          el.textContent = String(Math.round(target * (1 - (1 - p) ** 4)))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { once: true },
    )
  }
}

/** Fotografie v rámoch sa pri rolovaní jemne posúvajú proti smeru stránky. */
function parallax(): void {
  if (reduced) return
  const frames = $$('[data-parallax]')
  onFrame.push(() => {
    const vh = window.innerHeight
    for (const f of frames) {
      const r = f.getBoundingClientRect()
      if (r.bottom < -80 || r.top > vh + 80) continue
      const p = clamp((r.top + r.height / 2) / vh, -0.2, 1.2) - 0.5
      f.style.setProperty('--py', (p * -9).toFixed(2))
    }
  })
}

/** Kresba domu sa načítava z úložiska projektu; ak nie je dostupná, časť sa skryje. */
function elevation(): void {
  const fig = $('[data-elevation]')
  const art = $('[data-art]')
  if (!fig || !art) return
  const url = /url\(['"]?([^'")]+)['"]?\)/.exec(art.style.getPropertyValue('--art'))?.[1]
  if (!url || url.includes('%VITE_')) {
    fig.classList.add('is-missing')
    return
  }
  const probe = new Image()
  probe.onerror = () => fig.classList.add('is-missing')
  probe.src = url
}

// ───────────────────────── Podlažia ─────────────────────────

function floors(): void {
  const box = $('[data-floors]')
  if (!box) return
  const tabs = $$<HTMLButtonElement>('[data-floor]', box)
  const panels = $$('[data-panel]', box)
  const pill = $('[data-seg-pill]', box)
  const levels = $$<SVGGElement>('[data-level]', box)

  const movePill = () => {
    const on = tabs.find((t) => t.getAttribute('aria-selected') === 'true')
    if (!on || !pill) return
    pill.style.width = `${on.offsetWidth}px`
    pill.style.transform = `translateX(${on.offsetLeft}px)`
  }

  const select = (id: string, focus = false) => {
    for (const t of tabs) {
      const on = t.dataset.floor === id
      t.setAttribute('aria-selected', String(on))
      t.tabIndex = on ? 0 : -1
      if (on && focus) t.focus()
    }
    for (const p of panels) {
      const on = p.dataset.panel === id
      p.hidden = !on
      p.classList.toggle('is-on', on)
    }
    for (const l of levels) l.classList.toggle('is-active', l.dataset.level === id || (id === '2' && l.dataset.level === 'roof'))
    movePill()
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.floor ?? '0'))
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!step) return
      e.preventDefault()
      select(tabs[(i + step + tabs.length) % tabs.length].dataset.floor ?? '0', true)
    })
  })
  for (const l of levels) {
    l.style.cursor = 'pointer'
    l.addEventListener('click', () => select(l.dataset.level === 'roof' ? '2' : (l.dataset.level ?? '0')))
  }
  select('0')
  window.addEventListener('resize', movePill, { passive: true })
  // Písmo sa môže načítať neskôr a zmeniť šírku tlačidiel.
  void document.fonts?.ready.then(movePill)
}

// ───────────────────────── Galéria ─────────────────────────

function gallery(): void {
  const rail = $('[data-rail]')
  if (!rail) return
  const prev = $<HTMLButtonElement>('[data-gal-prev]')
  const next = $<HTMLButtonElement>('[data-gal-next]')
  const bar = $('[data-rail-bar]')
  const step = () => {
    const first = $('.shot', rail)
    return first ? first.offsetWidth + 20 : rail.clientWidth * 0.8
  }
  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth
    const p = max > 0 ? clamp(rail.scrollLeft / max) : 0
    const w = clamp(rail.clientWidth / rail.scrollWidth, 0.08, 1)
    bar?.style.setProperty('--w', `${(w * 100).toFixed(2)}%`)
    bar?.style.setProperty('--x', `${((p * (1 - w)) / w) * 100}%`)
    if (prev) prev.disabled = rail.scrollLeft < 4
    if (next) next.disabled = rail.scrollLeft > max - 4
  }
  prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }))
  next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }))
  rail.addEventListener('scroll', schedule, { passive: true })
  rail.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    rail.scrollBy({ left: e.key === 'ArrowRight' ? step() : -step(), behavior: reduced ? 'auto' : 'smooth' })
  })
  onFrame.push(update)

  // Ťahanie myšou; dotyk rieši prehliadač sám.
  let down = false
  let moved = false
  let x0 = 0
  let left0 = 0
  rail.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    down = true
    moved = false
    x0 = e.clientX
    left0 = rail.scrollLeft
  })
  window.addEventListener('pointermove', (e) => {
    if (!down) return
    const dx = e.clientX - x0
    if (!moved && Math.abs(dx) < 6) return
    moved = true
    rail.classList.add('is-dragging')
    rail.scrollLeft = left0 - dx
  })
  const end = () => {
    if (!down) return
    down = false
    if (!moved) return
    rail.classList.remove('is-dragging')
    // po pustení sa galéria dotiahne na najbližší záber
    const s = step()
    rail.scrollTo({ left: Math.round(rail.scrollLeft / s) * s, behavior: reduced ? 'auto' : 'smooth' })
  }
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}

// ───────────────────────── Formulár ─────────────────────────

const API = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const opened = Date.now()

function form(): void {
  const el = $<HTMLFormElement>('[data-form]')
  if (!el) return
  const fields = $('[data-form-fields]', el)
  const done = $('[data-form-done]', el)
  const error = $('[data-form-error]', el)
  const submit = $<HTMLButtonElement>('[data-form-submit]', el)
  const label = $('[data-form-label]', el)
  const consent = $('.consent', el)
  const input = (name: string) => el.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

  const fail = (text: string, at?: HTMLElement) => {
    if (error) {
      error.textContent = text
      error.hidden = false
    }
    at?.setAttribute('aria-invalid', 'true')
    at?.focus()
  }

  for (const f of $$<HTMLInputElement>('input, select, textarea', el)) {
    f.addEventListener('input', () => {
      f.removeAttribute('aria-invalid')
      consent?.removeAttribute('data-invalid')
      if (error) error.hidden = true
    })
  }

  el.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    if (error) error.hidden = true
    const name = input('name').value.trim()
    const email = input('email').value.trim()
    const phone = input('phone').value.trim()
    const message = input('message').value.trim()
    const interest = input('interest').value
    if (name.length < 2) return fail('Napíšte, prosím, svoje meno.', input('name'))
    if (!EMAIL.test(email)) return fail('Skontrolujte, prosím, e-mailovú adresu.', input('email'))
    if (!(input('consent') as HTMLInputElement).checked) {
      consent?.setAttribute('data-invalid', '')
      return fail('Bez súhlasu so spracovaním údajov vám nemôžeme odpovedať.')
    }

    const finish = () => {
      if (fields) fields.hidden = true
      if (done) done.hidden = false
      done?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    }
    // Pole, ktoré človek nevidí, a odoslanie do pár sekúnd po načítaní prezrádzajú robota.
    if (input('website').value !== '' || Date.now() - opened < 2500) return finish()
    // Náhľad stránky (mimo ostrej domény) nič neodosiela.
    if (el.hasAttribute('data-preview')) return fail('Toto je náhľad stránky – dopyt sa odošle až z ostrej stránky.')
    if (!API || !KEY) return fail('Formulár teraz nie je dostupný. Skúste to, prosím, neskôr.')

    if (submit) submit.disabled = true
    if (label) label.textContent = 'Odosielam…'
    try {
      const res = await fetch(`${API}/rest/v1/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY, Prefer: 'return=minimal' },
        body: JSON.stringify({ name, email, phone, message, interest, consent: true }),
      })
      if (res.ok) return finish()
      const text = await res.text().catch(() => '')
      fail(
        text.includes('too_many_inquiries')
          ? 'Práve prišlo veľa dopytov naraz. Skúste to, prosím, o hodinu.'
          : 'Dopyt sa nepodarilo odoslať. Skontrolujte údaje a skúste to znova.',
      )
    } catch {
      fail('Nepodarilo sa spojiť so serverom. Skontrolujte pripojenie a skúste to znova.')
    } finally {
      if (submit) submit.disabled = false
      if (label) label.textContent = 'Odoslať dopyt'
    }
  })
}

function privacy(): void {
  const box = $<HTMLDetailsElement>('[data-privacy]')
  for (const a of $$('[data-open-privacy]')) {
    a.addEventListener('click', () => {
      if (box) box.open = true
    })
  }
  if (box && window.location.hash === '#udaje') box.open = true
}

// ───────────────────────── Spustenie ─────────────────────────

function start(): void {
  nav()
  menu()
  hero()
  words()
  counters()
  reveal()
  parallax()
  elevation()
  floors()
  gallery()
  form()
  privacy()
  const year = $('[data-year]')
  if (year) year.textContent = String(new Date().getFullYear())
  schedule()
  // Dve snímky počkáme, aby vstupná animácia začala z pripraveného východiskového stavu.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
