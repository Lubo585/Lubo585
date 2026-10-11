import { motion, useReducedMotion } from 'motion/react'
import { why } from '../content/de'
import { Icon } from '../lib/Icon'
import { Container, SectionHeader } from '../lib/Section'
import { fadeUp, stagger } from '../lib/variants'

export default function Why() {
  const reduced = useReducedMotion()
  return (
    <section id="warum" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber/[0.06] blur-[140px]" />
      <Container>
        <SectionHeader eyebrow={why.eyebrow} title={why.title} subtitle={why.subtitle} align="center" />
        <motion.ul
          className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
          initial={reduced ? undefined : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-10% 0px' }}
          variants={stagger}
        >
          {why.items.map((w) => (
            <motion.li
              key={w.title}
              variants={fadeUp}
              className="group relative bg-ink p-8 transition-colors duration-500 hover:bg-ink-2"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-line text-amber transition-all duration-300 group-hover:border-amber group-hover:shadow-[0_0_30px_-6px_var(--color-amber)]">
                <Icon name={w.icon} size={20} />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mist">{w.text}</p>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  )
}
