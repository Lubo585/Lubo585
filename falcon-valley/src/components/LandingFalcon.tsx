import { motion, useReducedMotion, type MotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { asset } from '../lib/asset'

/**
 * Pristátie v dvoch fázach: sokol s roztiahnutými krídlami priletí z diaľky,
 * spomalí, roztiahne sa pred dosadnutím a v momente dotyku sa prelne do
 * pózy so zloženými krídlami na skalnom výbežku. Rešpektuje reduced motion.
 */
const FLIGHT_MS = 3600
const LAND_AT = 0.86 // podiel trvania letu, kedy začne prelínanie

export default function LandingFalcon({ y, opacity }: { y: MotionValue<number>; opacity: MotionValue<number> }) {
  const reduced = useReducedMotion()
  const [landed, setLanded] = useState(!!reduced)
  const [touch, setTouch] = useState(!!reduced)

  useEffect(() => {
    if (reduced) return
    const t1 = setTimeout(() => setTouch(true), 500 + FLIGHT_MS * LAND_AT)
    const t2 = setTimeout(() => setLanded(true), 500 + FLIGHT_MS + 200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reduced])

  const dust = Array.from({ length: 16 }, (_, i) => ({
    dx: (i % 2 ? 1 : -1) * (20 + ((i * 37) % 110)),
    dy: -(8 + ((i * 53) % 60)),
    size: 2 + ((i * 7) % 4),
    delay: (i % 5) * 0.05,
  }))

  return (
    <motion.div
      style={{ y, opacity }}
      className="pointer-events-none absolute bottom-0 right-0 z-10 h-[30svh] w-[44vw] max-w-[560px] sm:h-[58svh] sm:w-[34vw] lg:w-[30vw]"
      aria-hidden="true"
    >
      {/* skalný výbežok */}
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="absolute bottom-0 right-0 h-[26%] w-full">
        <defs>
          <linearGradient id="ledge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4452" />
            <stop offset="0.55" stopColor="#1a212c" />
            <stop offset="1" stopColor="#06080c" />
          </linearGradient>
        </defs>
        <path d="M0 160 L40 96 L120 70 L210 78 L300 54 L400 62 L400 160 Z" fill="url(#ledge)" />
        <path d="M40 96 L120 70 L150 100 L90 118 Z" fill="#0c1016" opacity="0.6" />
        <path d="M210 78 L300 54 L330 90 L250 104 Z" fill="#0c1016" opacity="0.45" />
        <path d="M120 70 L210 78 L300 54 L400 62 L400 68 L302 62 L212 86 L124 78 Z" fill="#f5f7fa" opacity="0.55" />
      </svg>

      {/* prach a sneh pri dosadnutí */}
      {touch && !reduced && (
        <div className="absolute bottom-[17%] left-1/2">
          {dust.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
              animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.4 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: p.delay }}
              className="absolute rounded-full bg-snow/80"
              style={{ width: p.size, height: p.size }}
            />
          ))}
        </div>
      )}

      {/* tieň */}
      <motion.div
        initial={reduced ? { opacity: 0.55, scaleX: 1 } : { opacity: 0, scaleX: 0.3 }}
        animate={touch ? { opacity: 0.55, scaleX: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[14%] left-1/2 h-[6%] w-[46%] -translate-x-1/2 rounded-[100%] bg-night blur-xl"
      />

      {/* fáza 1: let s roztiahnutými krídlami */}
      {!reduced && !landed && (
        <motion.img
          src={asset('falcon-flight.png')}
          alt=""
          draggable={false}
          initial={{ x: '150%', y: '-170%', scale: 0.12, rotate: 22, opacity: 0, filter: 'blur(4px)' }}
          animate={{
            x: ['150%', '95%', '45%', '12%', '-2%', '0%'],
            y: ['-170%', '-130%', '-80%', '-32%', '-6%', '0%'],
            scale: [0.12, 0.22, 0.45, 0.82, 1.05, 1.02],
            rotate: [22, 16, 6, -10, -4, 0],
            opacity: [0, 1, 1, 1, 1, touch ? 0 : 1],
            filter: ['blur(4px)', 'blur(3px)', 'blur(1.5px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
          }}
          transition={{
            duration: FLIGHT_MS / 1000,
            ease: [0.22, 0.9, 0.3, 1],
            times: [0, 0.16, 0.4, 0.66, LAND_AT, 1],
            delay: 0.5,
            opacity: { duration: FLIGHT_MS / 1000, times: [0, 0.16, 0.4, 0.66, LAND_AT, 1], delay: 0.5 },
          }}
          className="absolute bottom-[15%] left-1/2 w-[92%] origin-bottom -translate-x-1/2 drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
        />
      )}

      {/* fáza 2: dosadnutie so zloženými krídlami */}
      <motion.img
        src={asset('falcon-landing-2.png')}
        alt=""
        draggable={false}
        initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -14, scale: 1.04 }}
        animate={touch ? { opacity: 1, y: [ -14, 4, 0 ], scale: [1.04, 0.98, 1] } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[16%] left-1/2 w-[54%] origin-bottom -translate-x-1/2 drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
      />
    </motion.div>
  )
}
