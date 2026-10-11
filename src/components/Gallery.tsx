import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { gallery } from '../content/de'
import { Container, SectionHeader } from '../lib/Section'

export default function Gallery() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const x1 = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['4%', '-12%'])
  const x2 = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-12%', '4%'])
  const half = Math.ceil(gallery.items.length / 2)
  const rows = [gallery.items.slice(0, half), gallery.items.slice(half)]

  return (
    <section ref={ref} id="einblicke" className="relative overflow-hidden py-24 sm:py-32">
      <Container>
        <SectionHeader eyebrow={gallery.eyebrow} title={gallery.title} subtitle={gallery.subtitle} />
      </Container>
      <div className="mt-14 space-y-5">
        {rows.map((row, ri) => (
          <motion.div key={ri} style={{ x: ri === 0 ? x1 : x2 }} className="flex w-max gap-5 pl-5 sm:pl-8">
            {row.map((it, i) => (
              <motion.figure
                key={it.src}
                initial={reduced ? undefined : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                className="group relative h-56 w-72 shrink-0 overflow-hidden rounded-3xl border border-line sm:h-72 sm:w-96"
              >
                <img
                  src={it.src}
                  alt={it.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-ink/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber backdrop-blur">
                  {it.tag}
                </span>
                <figcaption className="absolute bottom-4 left-5 right-5 text-sm font-medium text-paper">{it.caption}</figcaption>
              </motion.figure>
            ))}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
