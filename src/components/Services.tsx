import { motion, useReducedMotion } from 'motion/react'
import { services } from '../content/de'
import { Icon } from '../lib/Icon'
import { Container, SectionHeader } from '../lib/Section'
import { fadeUp, stagger } from '../lib/variants'

export default function Services() {
  const reduced = useReducedMotion()
  return (
    <section id="leistungen" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeader eyebrow={services.eyebrow} title={services.title} subtitle={services.subtitle} />
        <motion.div
          className="mt-14 grid gap-5 md:grid-cols-2"
          initial={reduced ? undefined : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-10% 0px' }}
          variants={stagger}
        >
          {services.items.map((s, i) => (
            <motion.article
              key={s.title}
              variants={fadeUp}
              custom={0}
              whileHover={reduced ? undefined : { y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="group relative overflow-hidden rounded-3xl border border-line bg-ink-2/60 transition-colors hover:border-amber/50"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink-2/30 to-transparent" />
              </div>
              <div className="relative -mt-10 p-8 pt-0">
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber/10 text-amber transition-colors duration-300 group-hover:bg-amber group-hover:text-ink">
                  <Icon name={s.icon} size={22} />
                </span>
                <span className="font-display text-sm font-semibold text-mist/60">0{i + 1}</span>
              </div>
              <h3 className="mt-6 font-display text-xl font-bold sm:text-2xl">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-mist">{s.text}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
