import { motion, useReducedMotion, type MotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { asset } from '../lib/asset'

/**
 * Choreografia podľa filmového intra: sokol priletí zľava z diaľky, otočí sa
 * ku kamere, roztiahne krídla cez celú výšku sekcie a dosadne ako veľký detail
 * v ľavej časti; text sedí vpravo. V momente dotyku sa fáza letu prelne do pózy
 * so zloženými krídlami. Rešpektuje reduced motion.
 */
const FLIGHT_MS = 4400
const LAND_AT = 0.88

export default function LandingFalcon({ y, opacity }: { y: MotionValue<number>; opacity: MotionValue<number> }) {
  const reduced = useReducedMotion()
  const [landed, setLanded] = useState(!!reduced)
  const [touch, setTouch] = useState(!!reduced)

  useEffect(() => {
    if (reduced) return
    const t1 = setTimeout(() => setTouch(true), 400 + FLIGHT_MS * LAND_AT)
    const t2 = setTimeout(() => setLanded(true), 400 + FLIGHT_MS + 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reduced])

  const dust = Array.from({ length: 18 }, (_, i) => ({
    dx: (i % 2 ? 1 : -1) * (24 + ((i * 37) % 140)),
    dy: -(8 + ((i * 53) % 70)),
    size: 2 + ((i * 7) % 5),
    delay: (i % 5) * 0.05,
  }))
  const times = [0, 0.14, 0.34, 0.58, 0.76, LAND_AT, 1]

  return (
    <motion.div
      style={{ y, opacity }}
      className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-[34svh] w-[78vw] max-w-[640px] -translate-x-1/2 sm:h-[52svh] sm:w-[50vw] lg:left-0 lg:h-[82svh] lg:w-[46vw] lg:translate-x-0"
      aria-hidden="true"
    >
      {/* skalný výbežok */}
      <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-[18%] w-full">
        <defs>
          <linearGradient id="ledge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4452" />
            <stop offset="0.55" stopColor="#1a212c" />
            <stop offset="1" stopColor="#06080c" />
          </linearGradient>
        </defs>
        <path d="M0 62 L90 54 L190 78 L280 70 L360 96 L400 160 L0 160 Z" fill="url(#ledge)" />
        <path d="M90 54 L190 78 L170 104 L110 96 Z" fill="#0c1016" opacity="0.6" />
        <path d="M280 70 L360 96 L330 118 L250 104 Z" fill="#0c1016" opacity="0.45" />
        <path d="M0 62 L90 54 L190 78 L280 70 L278 78 L188 86 L92 62 L0 70 Z" fill="#f5f7fa" opacity="0.55" />
      </svg>

      {/* prach pri dosadnutí */}
      {touch && !reduced && (
        <div className="absolute bottom-[12%] left-1/2">
          {dust.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
              animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.4 }}
              transition={{ duration: 1.3, ease: 'easeOut', delay: p.delay }}
              className="absolute rounded-full bg-snow/80"
              style={{ width: p.size, height: p.size }}
            />
          ))}
        </div>
      )}

      {/* tieň */}
      <motion.div
        initial={reduced ? { opacity: 0.6, scaleX: 1 } : { opacity: 0, scaleX: 0.3 }}
        animate={touch ? { opacity: 0.6, scaleX: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[10%] left-1/2 h-[5%] w-[52%] -translate-x-1/2 rounded-[100%] bg-night blur-xl"
      />

      {/* fáza 1: prílet zľava z diaľky, otočka ku kamere, roztiahnutie */}
      {!reduced && !landed && (
        <motion.img
          src={asset('falcon-flight.png')}
          alt=""
          draggable={false}
          initial={{ x: '-120%', y: '-95%', scale: 0.08, rotate: -6, opacity: 0, filter: 'blur(5px)' }}
          animate={{
            x: ['-120%', '-80%', '-38%', '2%', '18%', '4%', '0%'],
            y: ['-95%', '-88%', '-72%', '-46%', '-16%', '-2%', '0%'],
            scale: [0.08, 0.16, 0.32, 0.7, 1.25, 1.12, 1.05],
            rotate: [-6, -4, 2, 8, -4, 0, 0],
            opacity: [0, 1, 1, 1, 1, 1, touch ? 0 : 1],
            filter: ['blur(5px)', 'blur(4px)', 'blur(2px)', 'blur(0.5px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
          }}
          transition={{
            duration: FLIGHT_MS / 1000,
            ease: [0.2, 0.85, 0.3, 1],
            times,
            delay: 0.4,
            opacity: { duration: FLIGHT_MS / 1000, times, delay: 0.4 },
          }}
          className="absolute bottom-[11%] left-1/2 w-[110%] max-w-none origin-bottom -translate-x-1/2 drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]"
        />
      )}

      {/* fáza 2: veľký detail po pristátí, otočený do stránky */}
      <motion.img
        src={asset('falcon-landing-2.png')}
        alt=""
        draggable={false}
        initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -16, scale: 1.05 }}
        animate={touch ? { opacity: 1, y: [-16, 5, 0], scale: [1.05, 0.985, 1] } : {}}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[12%] left-1/2 w-[64%] origin-bottom -translate-x-1/2 -scale-x-100 drop-shadow-[0_24px_40px_rgba(0,0,0,0.6)]"
        style={{ transform: 'translateX(-50%) scaleX(-1)' }}
      />
    </motion.div>
  )
}
