// Drobné pomôcky pre pohyb v rozhraní.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Nechá prvok dohrať animáciu odchodu, kým zmizne zo stránky.
 * `mounted` hovorí, či ho ešte vykresľovať, `phase`, ktorú animáciu má hrať.
 */
export function useMountTransition(open: boolean, ms: number): { mounted: boolean; phase: 'in' | 'out' } {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  useEffect(() => {
    if (open || !mounted) return
    const t = window.setTimeout(() => setMounted(false), ms)
    return () => window.clearTimeout(t)
  }, [open, mounted, ms])
  return { mounted, phase: open ? 'in' : 'out' }
}

/**
 * Posuvný podklad pod aktívnou položkou (segmentový prepínač, navigácia).
 * Aktívnu položku označte atribútom data-on="true"; podklad sa k nej plynulo presunie.
 */
export function useSlider<B extends HTMLElement, P extends HTMLElement>(active: string): { box: RefObject<B | null>; pill: RefObject<P | null> } {
  const box = useRef<B>(null)
  const pill = useRef<P>(null)
  useLayoutEffect(() => {
    const b = box.current
    const p = pill.current
    if (!b || !p) return
    const place = () => {
      const el = b.querySelector<HTMLElement>('[data-on="true"]')
      if (!el) {
        p.style.opacity = '0'
        return
      }
      p.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`
      p.style.width = `${el.offsetWidth}px`
      p.style.height = `${el.offsetHeight}px`
      p.style.opacity = '1'
    }
    place()
    // Prvé umiestnenie je bez pohybu; animuje sa až presun medzi položkami.
    const raf = window.requestAnimationFrame(() => p.classList.add('moving'))
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    ro?.observe(b)
    return () => {
      window.cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [active])
  return { box, pill }
}

/** true, keď je stránka posunutá ďalej než `threshold` px. */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [threshold])
  return scrolled
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Hodnota, ktorá sa k cieľu plynulo dopočíta (pri prvom zobrazení od nuly). */
export function useCountUp(value: number, ms = 900): number {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0))
  const from = useRef(reducedMotion() ? value : 0)
  useEffect(() => {
    if (reducedMotion()) {
      from.current = value
      const t = window.setTimeout(() => setShown(value), 0)
      return () => window.clearTimeout(t)
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const v = a + (value - a) * (1 - (1 - p) ** 4)
      from.current = v
      setShown(p < 1 ? v : value)
      if (p < 1) raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/** Stav načítania obrázka – aby sa namiesto chýbajúceho súboru ukázala náhrada. */
export function useImageOk(src: string | null): 'loading' | 'ok' | 'error' {
  const [state, setState] = useState<{ src: string | null; ok: 'loading' | 'ok' | 'error' }>({ src, ok: src ? 'loading' : 'error' })
  if (state.src !== src) setState({ src, ok: src ? 'loading' : 'error' })
  useEffect(() => {
    if (!src) return
    let alive = true
    const img = new Image()
    img.onload = () => alive && setState({ src, ok: 'ok' })
    img.onerror = () => alive && setState({ src, ok: 'error' })
    img.src = src
    return () => {
      alive = false
    }
  }, [src])
  return state.ok
}
