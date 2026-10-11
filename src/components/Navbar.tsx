import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { company, nav } from '../content/de'
import { scrollTo } from '../lib/scroll'
import { Magnetic } from '../lib/Magnetic'

export default function Navbar() {
  const { scrollY, scrollYProgress } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 160 && !open)
    setSolid(y > 24)
  })

  const go = (href: string) => {
    setOpen(false)
    scrollTo(href)
  }

  return (
    <>
      <motion.div
        className="fixed left-0 top-0 z-[60] h-[2px] w-full origin-left bg-amber"
        style={{ scaleX: scrollYProgress }}
      />
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`transition-all duration-500 ${
            solid ? 'border-b border-line/60 bg-ink/80 backdrop-blur-xl' : 'bg-transparent'
          }`}
        >
          <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                go('#top')
              }}
              className="group flex items-center gap-3"
              aria-label={company.legalName}
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber text-ink">
                <svg viewBox="0 0 64 64" className="h-6 w-6" fill="currentColor">
                  <path d="M12 44h8V30l10-6v20h8V18l10-6v32h4v6H12z" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block font-display text-base font-bold tracking-tight">{company.shortName}</span>
                <span className="block text-[11px] uppercase tracking-[0.18em] text-mist">{company.tagline}</span>
              </span>
            </a>

            <nav className="hidden items-center gap-8 lg:flex" aria-label="Hauptnavigation">
              {nav.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault()
                    go(l.href)
                  }}
                  className="group relative text-sm font-medium text-paper/80 transition-colors hover:text-paper"
                >
                  {l.label}
                  <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-amber transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              ))}
              <Magnetic>
                <a
                  href="#kontakt"
                  onClick={(e) => {
                    e.preventDefault()
                    go('#kontakt')
                  }}
                  className="inline-flex items-center rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-amber-2"
                >
                  {nav.cta}
                </a>
              </Magnetic>
            </nav>

            <button
              className="grid h-11 w-11 place-items-center rounded-full border border-line text-paper lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-ink/95 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex h-full flex-col justify-center gap-2 px-8">
              {nav.links.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault()
                    go(l.href)
                  }}
                  className="font-display text-4xl font-bold text-paper"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  {l.label}
                </motion.a>
              ))}
              <motion.a
                href="#kontakt"
                onClick={(e) => {
                  e.preventDefault()
                  go('#kontakt')
                }}
                className="mt-6 inline-flex w-fit items-center rounded-full bg-amber px-6 py-3 text-base font-semibold text-ink"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                {nav.cta}
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
