import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { story } from '../content/site'
import { useLang } from '../lib/lang'
import { SectionHeader, Container } from '../lib/Section'
import { FALCON_PATH, LAYERS } from './Art'

const ease = [0.22, 1, 0.36, 1] as const

function Step({ index, active, onActive, title, text }: { index: number; active: boolean; onActive: (i: number) => void; title: string; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => {
    if (inView) onActive(index)
  }, [inView, index, onActive])
  return (
    <div ref={ref} className="min-h-[60vh] flex flex-col justify-center py-10 lg:min-h-[70vh]">
      <motion.div animate={{ opacity: active ? 1 : 0.35, x: active ? 0 : -8 }} transition={{ duration: 0.6, ease }}>
        <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-rust">0{index + 1}</span>
        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-night sm:text-4xl">{title}</h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-stone/80 text-pretty">{text}</p>
      </motion.div>
    </div>
  )
}

const scenes = [
  { sky: ['#dbe8f8', '#f5f7fa'], peak: '#8fc3ff', accent: '#2a3a52' },
  { sky: ['#f7e7d2', '#f5f7fa'], peak: '#c7a67a', accent: '#b5651d' },
  { sky: ['#dfe9f3', '#ffffff'], peak: '#9fb4cc', accent: '#1c2430' },
  { sky: ['#e9eef4', '#f5f7fa'], peak: '#6f8db3', accent: '#06080c' },
]

export default function Story() {
  const { t } = useLang()
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const scene = scenes[active]

  return (
    <section id="story" className="relative bg-snow text-night">
      <Container className="pt-24 sm:pt-32">
        <SectionHeader eyebrow={t(story.eyebrow)} title={t(story.title)} tone="light" />
      </Container>

      <Container className="grid gap-10 pb-16 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          {story.steps.map((s, i) => (
            <Step key={i} index={i} active={active === i} onActive={setActive} title={t(s.title)} text={t(s.text)} />
          ))}
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:self-start">
          <div className="ring-glow relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-snow-2 lg:aspect-auto lg:h-full">
            <motion.div
              animate={{ background: `linear-gradient(to bottom, ${scene.sky[0]}, ${scene.sky[1]})` }}
              transition={{ duration: 1, ease }}
              className="absolute inset-0"
            />
            <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <motion.path d={LAYERS.far} animate={{ fill: scene.peak }} transition={{ duration: 1 }} opacity="0.55" />
              <path d={LAYERS.snowFar} fill="#ffffff" opacity="0.8" />
              <motion.path d={LAYERS.mid} animate={{ fill: scene.accent }} transition={{ duration: 1 }} opacity="0.75" />
              <motion.path d={LAYERS.near} animate={{ fill: scene.accent }} transition={{ duration: 1 }} />
              <motion.g
                animate={reduced ? {} : { x: [120 + active * 240, 180 + active * 240], y: [160, 140] }}
                transition={{ duration: 1.2, ease }}
              >
                <g transform="scale(1.6)">
                  <path d={FALCON_PATH} fill={scene.accent} />
                </g>
              </motion.g>
            </svg>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-8">
              <div className="flex gap-1.5">
                {story.steps.map((_, i) => (
                  <span key={i} className={`h-1 rounded-full transition-all duration-500 ${active === i ? 'w-8 bg-night' : 'w-3 bg-night/25'}`} />
                ))}
              </div>
              <motion.span
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-night/60"
              >
                {t(story.steps[active].title)}
              </motion.span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
