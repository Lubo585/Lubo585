import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { hero } from '../content/site'
import { useLang } from '../lib/lang'
import { SplitWords } from '../lib/Reveal'
import { Magnetic } from '../lib/Magnetic'
import { scrollTo } from '../lib/scroll'
import { FALCON_PATH, LAYERS, seededStars } from './Art'

const ease = [0.22, 1, 0.36, 1] as const

export default function Hero() {
  const { t } = useLang()
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const yFar = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 40])
  const yMid = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90])
  const yNear = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 160])
  const yText = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120])
  const scaleText = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.92])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const skyOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 40, damping: 20 })
  const sy = useSpring(my, { stiffness: 40, damping: 20 })
  const farX = useTransform(sx, (v) => v * -6)
  const midX = useTransform(sx, (v) => v * -14)
  const nearX = useTransform(sx, (v) => v * -26)
  const farY = useTransform([yFar, sy], ([a, b]) => (a as number) + (b as number) * -4)
  const nearY = useTransform([yNear, sy], ([a, b]) => (a as number) + (b as number) * -10)

  useEffect(() => {
    if (reduced) return
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my, reduced])

  const stars = useMemo(() => seededStars(90), [])

  return (
    <section ref={ref} id="top" className="noise relative isolate min-h-[100svh] overflow-hidden">
      {/* sky */}
      <motion.div style={{ opacity: skyOpacity }} className="absolute inset-0 -z-30 bg-[radial-gradient(120%_80%_at_50%_100%,#2a1d12_0%,#0d1420_42%,#06080c_80%)]" />

      <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 -z-20 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="dawn" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e8a33d" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#8fc3ff" stopOpacity="0.12" />
            <stop offset="1" stopColor="#06080c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4a66" />
            <stop offset="1" stopColor="#1a2330" />
          </linearGradient>
          <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f2937" />
            <stop offset="1" stopColor="#0f141c" />
          </linearGradient>
          <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f141c" />
            <stop offset="1" stopColor="#06080c" />
          </linearGradient>
          <radialGradient id="fogg" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#c7e1ff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#c7e1ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f5f7fa" className="star" style={{ animationDelay: `${s.d}s` }} />
          ))}
        </g>

        <rect x="0" y="120" width="1440" height="480" fill="url(#dawn)" />

        <motion.g style={{ y: farY, x: farX }}>
          <path d={LAYERS.far} fill="url(#far)" />
          <path d={LAYERS.snowFar} fill="#f5f7fa" opacity="0.55" />
        </motion.g>

        <g className="fog">
          <ellipse cx="500" cy="330" rx="520" ry="70" fill="url(#fogg)" />
        </g>

        <motion.g style={{ y: yMid, x: midX }}>
          <path d={LAYERS.mid} fill="url(#mid)" />
        </motion.g>

        <g className="fog fog-slow">
          <ellipse cx="1000" cy="430" rx="620" ry="80" fill="url(#fogg)" />
        </g>

        <motion.g style={{ y: nearY, x: nearX }}>
          <path d={LAYERS.near} fill="url(#near)" />
          <path d={LAYERS.floor} fill="#06080c" />
        </motion.g>
      </svg>

      {/* gliding falcon */}
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute left-0 top-0 h-full w-full">
            <svg viewBox="-42 -64 84 128" width="54" className="falcon-flight absolute drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]">
              <path d={FALCON_PATH} fill="#0b0f15" className="wing-flap" />
            </svg>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-t from-night to-transparent" />

      <motion.div
        style={{ y: yText, scale: scaleText, opacity }}
        className="mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col items-center justify-center px-5 pb-28 pt-32 text-center sm:px-8"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-mist backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          {t(hero.eyebrow)}
        </motion.span>

        <h1 className="gradient-text mt-7 font-display text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-balance sm:text-7xl lg:text-[6.5rem]">
          <SplitWords text={t(hero.title)} delay={0.25} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.9 }}
          className="mt-7 max-w-2xl text-lg leading-relaxed text-mist text-pretty sm:text-xl"
        >
          {t(hero.subtitle)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 1.1 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnetic>
            <button
              onClick={() => scrollTo('#shop')}
              className="group inline-flex items-center gap-2 rounded-full bg-snow px-6 py-3.5 text-base font-semibold text-night transition hover:bg-white"
            >
              {t(hero.primary)}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
          </Magnetic>
          <Magnetic>
            <button
              onClick={() => scrollTo('#story')}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-base font-medium text-snow transition hover:bg-white/5"
            >
              {t(hero.secondary)}
            </button>
          </Magnetic>
        </motion.div>
      </motion.div>

      <motion.button
        onClick={() => scrollTo('#hooks', 0)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mist"
        aria-label={t(hero.scroll)}
      >
        {t(hero.scroll)}
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>
    </section>
  )
}
