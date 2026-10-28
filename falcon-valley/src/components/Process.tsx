import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { process } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container, SectionHeader } from '../lib/Section'

export default function Process() {
  const { t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] })
  const line = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section className="relative bg-snow-2 text-night">
      <Container className="py-24 sm:py-32">
        <SectionHeader eyebrow={t(process.eyebrow)} title={t(process.title)} tone="light" align="center" />
        <div ref={ref} className="relative mt-16">
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-night/10 lg:block" />
          <motion.div style={{ height: line }} className="absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-rust lg:block" />
          <ol className="space-y-10 lg:space-y-0">
            {process.steps.map((s, i) => {
              const right = i % 2 === 1
              return (
                <li key={i} className={`relative lg:grid lg:grid-cols-2 lg:gap-16 ${i > 0 ? 'lg:-mt-6' : ''}`}>
                  <Reveal className={`${right ? 'lg:col-start-2' : 'lg:text-right'}`}>
                    <div className={`inline-block rounded-3xl border border-night/8 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(6,8,12,0.25)] ${right ? '' : 'lg:text-left'}`}>
                      <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-rust">0{i + 1}</span>
                      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{t(s.title)}</h3>
                      <p className="mt-2 max-w-sm text-base leading-relaxed text-stone/80">{t(s.text)}</p>
                    </div>
                  </Reveal>
                  <span className="absolute left-1/2 top-9 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-rust ring-4 ring-snow-2 lg:block" />
                </li>
              )
            })}
          </ol>
        </div>
      </Container>
    </section>
  )
}
