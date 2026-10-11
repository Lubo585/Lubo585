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
      <div className="absolute inset-0 -z-20">
        <motion.img
          src={hero.background}
          alt=""
          aria-hidden="true"
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease }}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/78" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
      </div>
      <div className="grid-bg absolute inset-0 -z-10 opacity-60" />
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
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md sm:aspect-square">
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 1.2, ease, delay: 0.4 }}
        className="absolute inset-x-0 top-0 h-[72%] overflow-hidden rounded-[2rem] border border-line shadow-2xl"
      >
        <motion.img
          src={hero.photoMain}
          alt="Zimmerer bei Dachstuhlarbeiten"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease, delay: 0.4 }}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 1.2, ease, delay: 0.65 }}
        className="absolute bottom-0 right-0 h-[48%] w-[58%] overflow-hidden rounded-[1.5rem] border-4 border-ink shadow-2xl"
      >
        <motion.img
          src={hero.photoSmall}
          alt="Rohbau mit Porenbetonwänden"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease, delay: 0.65 }}
          className="h-full w-full object-cover"
        />
      </motion.div>

      <motion.div
        animate={floatA}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        className="absolute -left-4 top-8 rounded-2xl border border-line bg-ink-2/90 p-4 shadow-2xl backdrop-blur sm:-left-8"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Einsatzbereit</p>
        <p className="mt-1 font-display text-2xl font-bold text-amber">10–14 Tage</p>
      </motion.div>
      <motion.div
        animate={floatB}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-[30%] left-0 rounded-2xl border border-line bg-ink-2/90 p-4 shadow-2xl backdrop-blur sm:-left-6"
      >
        <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Teams</p>
        <p className="mt-1 font-display text-2xl font-bold">4 – 30 Mann</p>
      </motion.div>
    </div>
  )
}
