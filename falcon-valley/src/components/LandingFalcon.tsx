import { motion, useReducedMotion, type MotionValue } from 'motion/react'
import { useEffect, useState } from 'react'
import { asset } from '../lib/asset'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Zlatý saker priletí z diaľky, spomalí, roztiahne sa a pristane na skale
 * v pravom dolnom rohu úvodnej sekcie. Potom jemne dýcha a reaguje na scroll.
 */
export default function LandingFalcon({ y, opacity }: { y: MotionValue<number>; opacity: MotionValue<number> }) {
  const reduced = useReducedMotion()
  const [landed, setLanded] = useState(!!reduced)

  useEffect(() => {
    if (reduced) return
    const t = setTimeout(() => setLanded(true), 3300)
    return () => clearTimeout(t)
  }, [reduced])

  const dust = Array.from({ length: 14 }, (_, i) => ({
    dx: (i % 2 ? 1 : -1) * (20 + ((i * 37) % 90)),
    dy: -(10 + ((i * 53) % 50)),
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
      {landed && !reduced && (
        <div className="absolute bottom-[17%] left-1/2">
          {dust.map((p, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
              animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.4 }}
              transition={{ duration: 1.1, ease: 'easeOut', delay: p.delay }}
              className="absolute rounded-full bg-snow/80"
              style={{ width: p.size, height: p.size }}
            />
          ))}
        </div>
      )}

      {/* tieň */}
      <motion.div
        initial={reduced ? { opacity: 0.55, scaleX: 1 } : { opacity: 0, scaleX: 0.3 }}
        animate={{ opacity: 0.55, scaleX: 1 }}
        transition={{ duration: 0.9, ease, delay: reduced ? 0 : 2.6 }}
        className="absolute bottom-[14%] left-1/2 h-[6%] w-[46%] -translate-x-1/2 rounded-[100%] bg-night blur-xl"
      />

      {/* sokol – prílet po krivke, spomalenie, roztiahnutie, dosadnutie */}
      <motion.img
        src={asset('falcon-landing.png')}
        alt=""
        draggable={false}
        initial={
          reduced
            ? { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px)' }
            : { x: '-140%', y: '-120%', scale: 0.18, rotate: -28, opacity: 0, filter: 'blur(3px)' }
        }
        animate={
          reduced
            ? {}
            : {
                x: ['-140%', '-90%', '-40%', '-8%', '2%', '0%'],
                y: ['-120%', '-95%', '-55%', '-18%', '3%', '0%'],
                scale: [0.18, 0.3, 0.55, 0.9, 1.04, 1],
                rotate: [-28, -22, -12, 6, -2, 0],
                opacity: [0, 1, 1, 1, 1, 1],
                filter: ['blur(3px)', 'blur(2px)', 'blur(1px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
              }
        }
        transition={{ duration: 3.2, ease, times: [0, 0.18, 0.42, 0.72, 0.9, 1], delay: 0.6 }}
        className="absolute bottom-[16%] left-1/2 w-[62%] origin-bottom -translate-x-1/2 drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
      />

    </motion.div>
  )
}
