import { motion, useReducedMotion } from 'motion/react'
import { marquee } from '../content/de'

export default function Marquee() {
  const reduced = useReducedMotion()
  const items = [...marquee, ...marquee]
  return (
    <div className="relative overflow-hidden border-y border-line bg-ink-2/40 py-5" aria-hidden="true">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap"
        animate={reduced ? {} : { x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 32, ease: 'linear' }}
      >
        {items.map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-xl font-semibold text-paper/70">
            {t}
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}
