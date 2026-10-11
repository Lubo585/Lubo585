import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { hero } from '../content/de'
import { SplitWords } from '../lib/Reveal'
import { Magnetic } from '../lib/Magnetic'
import { scrollTo } from '../lib/scroll'

const ease = [0.22, 1, 0.36, 1] as const

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yText = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140])
  const yArt = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -120])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const glowX = useSpring(mx, { stiffness: 60, damping: 20 })
  const glowY = useSpring(my, { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (reduced) return
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX)
      my.set(e.clientY)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my, reduced])

  return (
    <section ref={ref} id="top" className="noise relative isolate min-h-[100svh] overflow-hidden pt-20">
      <div className="grid-bg absolute inset-0 -z-10" />
      <motion.div
        className="pointer-events-none absolute -z-10 h-[520px] w-[520px] rounded-full bg-amber/15 blur-[120px]"
        style={{ x: glowX, y: glowY, translateX: '-50%', translateY: '-50%' }}
      />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:px-12 lg:pt-24">
        <motion.div style={{ y: yText, opacity }} className="lg:col-span-7">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-2/60 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-mist"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            {hero.eyebrow}
          </motion.span>

          <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            {hero.titleLines.map((line, i) => (
              <span key={i} className={`block ${line === hero.highlight ? 'text-amber' : ''}`}>
                <SplitWords text={line} delay={0.2 + i * 0.12} />
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.75 }}
            className="mt-7 max-w-xl text-base leading-relaxed text-mist sm:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.9 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <a
                href="#kontakt"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo('#kontakt')
                }}
                className="group inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-amber-2"
              >
                {hero.primaryCta}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Magnetic>
            <a
              href="#leistungen"
              onClick={(e) => {
                e.preventDefault()
                scrollTo('#leistungen')
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3.5 text-base font-semibold text-paper transition-colors hover:border-mist"
            >
              {hero.secondaryCta}
            </a>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 1.1 } } }}
            className="mt-10 flex flex-wrap gap-x-6 gap-y-3"
          >
            {hero.badges.map((b) => (
              <motion.li
                key={b}
                variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease } } }}
                className="flex items-center gap-2 text-sm text-paper/80"
              >
                <CheckCircle2 size={16} className="text-amber" />
                {b}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div style={{ y: yArt }} className="relative lg:col-span-5">
          <HeroArt />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1 }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-mist md:flex"
      >
        Scrollen
        <span className="relative h-10 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute left-0 top-0 h-4 w-px bg-amber"
            animate={{ y: [-16, 40] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  )
}

function HeroArt() {
  const reduced = useReducedMotion()
  const floatA = reduced ? {} : { y: [0, -14, 0] }
  const floatB = reduced ? {} : { y: [0, 12, 0] }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.2, ease, delay: 0.4 }}
        className="absolute inset-0 rounded-[2rem] border border-line bg-gradient-to-br from-ink-3 to-ink-2 p-6"
      >
        <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f5a524" />
              <stop offset="1" stopColor="#ffc04d" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.line
              key={i}
              x1="40"
              x2="360"
              y1={60 + i * 48}
              y2={60 + i * 48}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          ))}
          <motion.path
            d="M60 320 L60 190 L130 150 L130 320 Z"
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease, delay: 0.7 }}
          />
          <motion.path
            d="M150 320 L150 130 L240 80 L240 320 Z"
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease, delay: 0.9 }}
          />
          <motion.path
            d="M260 320 L260 160 L340 120 L340 320 Z"
            fill="url(#g1)"
            fillOpacity="0.9"
            initial={{ pathLength: 0, opacity: 0, y: 30 }}
            animate={{ pathLength: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease, delay: 1.1 }}
          />
          <motion.rect
            x="40"
            y="320"
            width="320"
            height="4"
            fill="#f5a524"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, ease, delay: 0.6 }}
            style={{ transformOrigin: '40px 322px' }}
          />
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <line x1="200" y1="40" x2="200" y2="80" stroke="#f5a524" strokeWidth="2" />
            <line x1="120" y1="40" x2="330" y2="40" stroke="#f5a524" strokeWidth="2" />
            <motion.line
              x1="300"
              y1="40"
              x2="300"
              y2="118"
              stroke="#f5a524"
              strokeWidth="1.5"
              animate={reduced ? {} : { y2: [118, 100, 118] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            />
          </motion.g>
        </svg>
      </motion.div>

      <motion.div
        animate={floatA}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        className="absolute -left-6 top-10 rounded-2xl border border-line bg-ink-2/90 p-4 shadow-2xl backdrop-blur"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Einsatzbereit</p>
        <p className="mt-1 font-display text-2xl font-bold text-amber">10–14 Tage</p>
      </motion.div>
      <motion.div
        animate={floatB}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -right-4 bottom-10 rounded-2xl border border-line bg-ink-2/90 p-4 shadow-2xl backdrop-blur"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Teams</p>
        <p className="mt-1 font-display text-2xl font-bold">4 – 30 Mann</p>
      </motion.div>
    </div>
  )
}
