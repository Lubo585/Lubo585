import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { valley } from '../content/site'
import { useLang } from '../lib/lang'
import { FALCON_PATH, seededStars } from './Art'
import { photos } from '../content/photos'
import { usePhotoAvailable } from './Photo'

const STARS = seededStars(70, 3)

/* Panoráma Tatier – viewBox 0 0 3000 700 */
const RIDGE =
  'M0 520 L120 470 L200 500 L270 400 L330 440 L400 360 L470 420 L560 380 L640 440 L720 400 L800 450 L900 300 L960 360 L1040 330 L1120 420 L1200 380 L1290 440 L1360 390 L1440 240 L1520 320 L1600 290 L1680 400 L1760 360 L1860 420 L1940 380 L2040 440 L2120 400 L2200 360 L2280 250 L2360 330 L2440 300 L2520 410 L2600 370 L2700 260 L2780 340 L2860 310 L2940 420 L3000 400 L3000 700 L0 700 Z'
const FRONT =
  'M0 600 L150 560 L300 590 L450 540 L600 580 L780 520 L950 570 L1120 530 L1300 580 L1500 540 L1700 590 L1900 550 L2100 600 L2300 550 L2500 590 L2700 540 L2850 580 L3000 560 L3000 700 L0 700 Z'
const SNOW =
  'M900 300 L930 340 L960 360 L990 345 L1040 330 L1070 370 L1030 380 L980 380 L940 372 Z M1440 240 L1470 290 L1520 320 L1560 300 L1600 290 L1640 345 L1590 350 L1540 350 L1500 340 L1460 330 Z M2280 250 L2310 300 L2360 330 L2400 310 L2440 300 L2480 350 L2430 355 L2380 355 L2340 345 L2300 330 Z M2700 260 L2730 300 L2780 340 L2820 320 L2860 310 L2900 360 L2850 362 L2800 362 L2760 350 Z'

export default function Valley() {
  const { t } = useLang()
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-52%'])
  const xFront = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-64%'])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.12, 0.85, 1], [0, 1, 1, 0])
  const falconX = useTransform(scrollYProgress, [0, 1], ['-10vw', '110vw'])
  const falconY = useTransform(scrollYProgress, [0, 0.5, 1], ['38vh', '22vh', '34vh'])
  const hasPhoto = usePhotoAvailable(photos.valley.src)
  const photoX = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-12%'])

  return (
    <section ref={ref} id="valley" className="relative h-[260vh] bg-night">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(100%_70%_at_50%_100%,#1f1a12_0%,#0d1420_45%,#06080c_80%)]" />
        {hasPhoto && (
          <motion.div style={{ x: photoX }} className="absolute inset-y-0 left-0 w-[125vw]" aria-hidden="true">
            <img src={photos.valley.src} alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-night/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-night/80 via-night/20 to-night" />
          </motion.div>
        )}
        <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMin slice" className="absolute inset-x-0 top-0 h-[45vh] w-full" aria-hidden="true">
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f5f7fa" className="star" style={{ animationDelay: `${s.d}s` }} />
          ))}
        </svg>

        <motion.div style={{ x }} className="absolute bottom-0 left-0 h-[58vh] w-[260vw] sm:w-[200vw]">
          <svg viewBox="0 0 3000 700" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <defs>
              <linearGradient id="vr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2b3a52" />
                <stop offset="1" stopColor="#0c1016" />
              </linearGradient>
            </defs>
            <path d={RIDGE} fill="url(#vr)" />
            <path d={SNOW} fill="#f5f7fa" opacity="0.6" />
          </svg>
          {valley.peaks.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              style={{ left: `${p.x}%` }}
              className="absolute top-[22%] flex -translate-x-1/2 flex-col items-center"
            >
              <span className="max-w-[7rem] text-center font-display text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-glacier-2/90 sm:max-w-none sm:text-sm sm:tracking-[0.2em]">{p.name}</span>
              <span className="mt-1 font-display text-lg font-semibold tabular-nums text-snow sm:text-2xl">{p.height} m</span>
              <span className="mt-2 h-10 w-px bg-gradient-to-b from-glacier/60 to-transparent" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div style={{ x: xFront }} className="absolute bottom-0 left-0 h-[36vh] w-[260vw] sm:w-[200vw]">
          <svg viewBox="0 0 3000 700" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <path d={FRONT} fill="#06080c" />
          </svg>
        </motion.div>

        <motion.svg style={{ x: falconX, y: falconY }} viewBox="-42 -64 84 128" width="40" className="absolute left-0 top-0 text-night drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]" aria-hidden="true">
          <path d={FALCON_PATH} fill="#f5f7fa" opacity="0.9" />
        </motion.svg>

        <motion.div style={{ opacity: titleOpacity }} className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-start px-5 pt-24 text-center sm:px-8 sm:pt-28">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            <span className="h-px w-6 bg-brand" />
            {t(valley.eyebrow)}
          </span>
          <h2 className="gradient-text mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t(valley.title)}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist text-pretty sm:text-lg">{t(valley.text)}</p>
        </motion.div>
      </div>
    </section>
  )
}
