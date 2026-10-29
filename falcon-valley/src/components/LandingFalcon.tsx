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
    const t = setTimeout(() => setLanded(true), 4100)
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
        transition={{ duration: 0.9, ease, delay: reduced ? 0 : 3.4 }}
        className="absolute bottom-[14%] left-1/2 h-[6%] w-[46%] -translate-x-1/2 rounded-[100%] bg-night blur-xl"
      />

      {/* sokol – prílet po krivke, spomalenie, roztiahnutie, dosadnutie */}
      <motion.img
        src={asset('falcon-landing-2.png')}
        alt=""
        draggable={false}
        initial={
          reduced
            ? { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px)' }
            : { x: '120%', y: '-150%', scale: 0.14, rotate: 18, opacity: 0, filter: 'blur(4px)' }
        }
        animate={
          reduced
            ? {}
            : {
                x: ['120%', '80%', '38%', '8%', '-4%', '1%', '0%'],
                y: ['-150%', '-118%', '-72%', '-30%', '-6%', '2%', '0%'],
                scale: [0.14, 0.24, 0.46, 0.8, 1.03, 0.99, 1],
                rotate: [18, 14, 6, -8, -3, 1, 0],
                opacity: [0, 1, 1, 1, 1, 1, 1],
                filter: ['blur(4px)', 'blur(3px)', 'blur(1.5px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
              }
        }
        transition={{ duration: 4.2, ease: [0.22, 0.9, 0.3, 1], times: [0, 0.16, 0.38, 0.64, 0.84, 0.94, 1], delay: 0.5 }}
        className="absolute bottom-[16%] left-1/2 w-[54%] origin-bottom -translate-x-1/2 drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
      />

    </motion.div>
  )
}
