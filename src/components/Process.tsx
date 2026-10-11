import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { process } from '../content/de'
import { Container, SectionHeader } from '../lib/Section'
import { Reveal } from '../lib/Reveal'

export default function Process() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 60%'] })
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section id="ablauf" className="relative py-24 sm:py-32">
      <Container>
        <SectionHeader eyebrow={process.eyebrow} title={process.title} />
        <div ref={ref} className="relative mt-16">
          <div className="absolute left-5 top-0 hidden h-full w-px bg-line md:left-1/2 md:block" />
          <motion.div
            className="absolute left-5 top-0 hidden h-full w-px origin-top bg-amber md:left-1/2 md:block"
            style={{ scaleY: reduced ? 1 : lineScale }}
          />
          <ol className="space-y-10 md:space-y-16">
            {process.steps.map((s, i) => {
              const left = i % 2 === 0
              return (
                <li key={s.n} className="relative md:grid md:grid-cols-2 md:gap-16">
                  <div className={`${left ? 'md:col-start-1 md:text-right' : 'md:col-start-2'} md:pr-0`}>
                    <Reveal>
                      <div
                        className={`rounded-3xl border border-line bg-ink-2/60 p-7 sm:p-8 ${
                          left ? 'md:ml-auto' : ''
                        } md:max-w-lg`}
                      >
                        <span className="font-display text-4xl font-extrabold text-amber/90">{s.n}</span>
                        <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
                        <p className="mt-2 leading-relaxed text-mist">{s.text}</p>
                      </div>
                    </Reveal>
                  </div>
                  <motion.span
                    initial={reduced ? undefined : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '-20% 0px' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="absolute left-1/2 top-8 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-ink bg-amber md:block"
                  />
                </li>
              )
            })}
          </ol>
        </div>
      </Container>
    </section>
  )
}
