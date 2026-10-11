import { animate, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { stats } from '../content/de'
import { Container } from '../lib/Section'
import { fadeUp, stagger } from '../lib/variants'

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const reduced = useReducedMotion()
  const [n, setN] = useState(reduced ? value : 0)

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
      {n}
      {suffix}
    </span>
  )
}

export default function Stats() {
  const reduced = useReducedMotion()
  return (
    <section className="relative border-y border-line bg-ink-2/40 py-16 sm:py-20">
      <Container>
        <motion.dl
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
          initial={reduced ? undefined : 'hidden'}
          whileInView="show"
          viewport={{ once: true, margin: '-10% 0px' }}
          variants={stagger}
        >
          {stats.items.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="border-l border-amber/60 pl-6">
              <dt className="order-last mt-2 text-sm uppercase tracking-[0.16em] text-mist">{s.label}</dt>
              <dd className="font-display text-5xl font-extrabold text-paper">
                <Counter value={s.value} suffix={s.suffix} />
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </Container>
    </section>
  )
}
