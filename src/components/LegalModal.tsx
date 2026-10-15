import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { datenschutz, impressum, type LegalPage } from '../content/legal'

const pages: Record<string, LegalPage> = { impressum, datenschutz }

function fromHash(): LegalPage | null {
  const h = window.location.hash.replace('#', '')
  return pages[h] ?? null
}

export default function LegalModal() {
  const [page, setPage] = useState<LegalPage | null>(null)

  useEffect(() => {
    const sync = () => setPage(fromHash())
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setPage(null)
  }

  useEffect(() => {
    if (!page) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [page])

  return (
    <AnimatePresence>
      {page && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/80 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-title"
        >
          <motion.article
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-line bg-ink-2 p-6 sm:rounded-[2rem] sm:p-10"
          >
            <button
              onClick={close}
              aria-label="Schließen"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line text-paper transition-colors hover:border-amber hover:text-amber"
            >
              <X size={18} />
            </button>
            <h2 id="legal-title" className="font-display text-3xl font-bold">
              {page.title}
            </h2>
            <div className="mt-8 space-y-7">
              {page.sections.map((s) => (
                <section key={s.heading}>
                  <h3 className="font-display text-lg font-bold text-amber">{s.heading}</h3>
                  <div className="mt-2 space-y-2 text-sm leading-relaxed text-paper/85">
                    {s.paragraphs.map((p, i) => (
                      <p key={i} className="break-words">
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
