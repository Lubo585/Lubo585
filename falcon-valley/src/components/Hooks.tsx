import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { hooks, marquee } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container } from '../lib/Section'
import { FalconSilhouette } from './Art'

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px' })
  const reduced = useReducedMotion()
  const [n, setN] = useState(reduced ? value : 0)
  const { lang } = useLang()

  useEffect(() => {
    if (!inView || reduced) return
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value, reduced])

  return (
    <span ref={ref} className="tabular-nums">
      {new Intl.NumberFormat(lang === 'sk' ? 'sk-SK' : 'en-GB').format(n)}
      {suffix}
    </span>
  )
}

export default function Hooks() {
  const { t } = useLang()
  const items = [...marquee, ...marquee]
  return (
    <section id="hooks" className="relative border-y border-white/5 bg-night">
      <Container className="py-20 sm:py-28">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {hooks.map((h, i) => (
            <Reveal key={i} delay={i} className="border-l border-white/10 pl-6">
              <div className="gradient-text whitespace-nowrap font-display text-4xl font-semibold tracking-tight sm:text-5xl xl:text-[3.4rem]">
                <Counter value={h.value} suffix={h.suffix} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-mist">{t(h.label)}</p>
            </Reveal>
          ))}
        </div>
      </Container>

      <div className="marquee relative overflow-hidden border-t border-white/5 py-5" aria-hidden="true">
        <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
          {items.map((m, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-sm font-medium uppercase tracking-[0.25em] text-mist/80">
              {t(m)}
              <FalconSilhouette size={22} className="text-brand" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
