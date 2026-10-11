import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { MapPin } from 'lucide-react'
import { useRef } from 'react'
import { references } from '../content/de'
import { Container, SectionHeader } from '../lib/Section'
import { Reveal } from '../lib/Reveal'
import { fadeUp, stagger } from '../lib/variants'

export default function References() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%'])
  const f = references.featured

  return (
    <section id="referenzen" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeader eyebrow={references.eyebrow} title={references.title} />

        <Reveal className="mt-14">
          <div ref={ref} className="group grid overflow-hidden rounded-[2rem] border border-line bg-ink-2/60 lg:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[460px]">
              <motion.img
                src={f.image}
                alt={`${f.name} – ${f.type}`}
                style={{ y, scale: 1.18 }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 will-change-transform"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent lg:bg-gradient-to-r" />
              <span className="absolute left-5 top-5 rounded-full bg-amber px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
                Hall of Fame Award
              </span>
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <p className="flex items-center gap-2 text-sm text-mist">
                <MapPin size={16} className="text-amber" /> {f.location}
              </p>
              <h3 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{f.name}</h3>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-amber">{f.type}</p>
              <p className="mt-5 leading-relaxed text-mist">{f.text}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {f.tags.map((t) => (
                  <li key={t} className="rounded-full border border-line px-3 py-1 text-xs text-paper/80">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <motion.ul
          className="mt-6 grid gap-5 md:grid-cols-3"
          initial={reduced ? undefined : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-10% 0px' }}
          variants={stagger}
        >
          {references.others.map((r) => (
            <motion.li
              key={r.name + r.location}
              variants={fadeUp}
              whileHover={reduced ? undefined : { y: -4 }}
              className="group overflow-hidden rounded-3xl border border-line bg-ink-2/40 transition-colors hover:border-amber/50"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={r.image}
                  alt={r.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="p-7">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-mist">
                <MapPin size={14} className="text-amber" /> {r.location}
              </p>
              <h3 className="mt-3 font-display text-xl font-bold">{r.name}</h3>
              <p className="mt-2 text-sm text-mist">{r.scope}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        <Reveal as="p" className="mt-8 text-sm text-mist">
          {references.note}
        </Reveal>
      </Container>
    </section>
  )
}
