import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { nav } from '../content/site'
import { useLang } from '../lib/lang'
import { scrollTo } from '../lib/scroll'
import { Logo } from './Art'

const ease = [0.22, 1, 0.36, 1] as const

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setHidden(y > prev && y > 120 && !open)
    setSolid(y > 24)
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const go = (id: string) => {
    setOpen(false)
    scrollTo(`#${id}`, id === 'top' ? 0 : -72)
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: hidden ? -90 : 0, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          className={`mx-auto mt-3 flex max-w-7xl items-center justify-between rounded-full border px-4 py-2 transition-all duration-500 sm:mx-5 lg:mx-auto ${
            solid ? 'glass border-white/10' : 'border-transparent'
          }`}
        >
          <a href="#top" onClick={(e) => { e.preventDefault(); go('top') }} aria-label="Falcon Valley">
            <Logo />
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => { e.preventDefault(); go(item.id) }}
                className="rounded-full px-4 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-snow"
              >
                {t(item.label)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-white/10 p-0.5 text-xs font-semibold">
              {(['sk', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`relative rounded-full px-2.5 py-1 uppercase transition ${lang === l ? 'text-night' : 'text-mist hover:text-snow'}`}
                  aria-pressed={lang === l}
                >
                  {lang === l && (
                    <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-snow" transition={{ duration: 0.4, ease }} />
                  )}
                  <span className="relative">{l}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => go('shop')}
              className="hidden rounded-full bg-amber px-4 py-2 text-sm font-semibold text-night transition hover:bg-amber-2 sm:inline-flex"
            >
              {t(nav.cta)}
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-snow lg:hidden"
              aria-label="Menu"
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="glass fixed inset-0 z-40 flex flex-col justify-center px-8 lg:hidden"
          >
            <nav className="flex flex-col gap-2">
              {nav.items.map((item, i) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => { e.preventDefault(); go(item.id) }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease, delay: 0.05 + i * 0.06 }}
                  className="font-display text-4xl font-semibold tracking-tight text-snow"
                >
                  {t(item.label)}
                </motion.a>
              ))}
            </nav>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.4 }}
              onClick={() => go('shop')}
              className="mt-10 self-start rounded-full bg-amber px-6 py-3 text-base font-semibold text-night"
            >
              {t(nav.cta)}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
