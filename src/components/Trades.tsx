import { motion, useReducedMotion } from 'motion/react'
import { trades } from '../content/de'
import { Container, SectionHeader } from '../lib/Section'
import { fadeUp, stagger } from '../lib/variants'

export default function Trades() {
  const reduced = useReducedMotion()
  return (
    <section id="gewerke" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      <Container>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeader eyebrow={trades.eyebrow} title={trades.title} subtitle={trades.subtitle} />
          </div>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:col-span-8"
            initial={reduced ? undefined : 'hidden'}
            whileInView="show"
            viewport={{ once: true, margin: '-10% 0px' }}
            variants={stagger}
          >
            {trades.groups.map((g) => (
              <motion.div
                key={g.name}
                variants={fadeUp}
                className="rounded-3xl border border-line bg-ink-2/40 p-7"
              >
                <h3 className="font-display text-lg font-bold text-amber">{g.name}</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((t) => (
                    <motion.li
                      key={t}
                      whileHover={reduced ? undefined : { scale: 1.05 }}
                      className="rounded-full border border-line bg-ink px-3.5 py-1.5 text-sm text-paper/85 transition-colors hover:border-amber/60"
                    >
                      {t}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
