import type { Species } from '../content/falcons'

export function seededStars(n: number, seed = 7) {
  const out: { x: number; y: number; r: number; d: number }[] = []
  let s = seed
  const rnd = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let i = 0; i < n; i++) out.push({ x: rnd() * 1440, y: rnd() * 320, r: 0.6 + rnd() * 1.4, d: rnd() * 4 })
  return out
}

/** Silueta sokola v lete (pohľad zhora), smeruje doprava. */
export const FALCON_PATH =
  'M36,0 C36,-3 31,-5.5 25,-5.5 L12,-8 C20,-24 2,-42 -28,-58 C-31,-60 -34,-57 -32,-53 C-24,-40 -19,-24 -15,-8 L-19,-4 L-36,-10 L-34,0 L-36,10 L-19,4 C-19,24 -24,40 -32,53 C-34,57 -31,60 -28,58 C2,42 20,24 12,8 L25,5.5 C31,5.5 36,3 36,0 Z'

export function FalconSilhouette({ className = '', size = 64, color = 'currentColor' }: { className?: string; size?: number; color?: string }) {
  return (
    <svg viewBox="-42 -64 84 128" width={size} height={(size * 128) / 84} className={className} aria-hidden="true">
      <path d={FALCON_PATH} fill={color} />
    </svg>
  )
}

/** Značka FV z originálneho loga (public/logo-mark.png, priehľadné pozadie). */
export function FVMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return <img src="/logo-mark.png" alt="" width={Math.round(size * 3.46)} height={size} className={`block select-none ${className}`} draggable={false} />
}

/** Logo do lišty: značka + názov + arabský podtitul. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <FVMark size={26} />
      <span className="hidden flex-col leading-none sm:flex">
        <span className="font-display text-[14px] font-bold uppercase tracking-[0.2em] text-brand">Falcons Valley</span>
        <span className="mt-0.5 text-[11px] tracking-wide text-gold" dir="rtl" lang="ar">
          وادي الصقور
        </span>
      </span>
    </span>
  )
}

/** Celé originálne logo (značka, názov, arabský podtitul) ako obrázok. */
export function LogoFull({ className = '', width = 260 }: { className?: string; width?: number }) {
  return (
    <img
      src="/logo-full.png"
      srcSet="/logo-full.png 1x, /logo-full@2x.png 2x"
      alt="Falcons Valley – وادي الصقور"
      width={width}
      height={Math.round(width * (236 / 455))}
      className={`block select-none ${className}`}
      draggable={false}
    />
  )
}

/* Vrstvy tatranských štítov pre hero – viewBox 0 0 1440 600 */
export const LAYERS = {
  far: 'M0 420 L60 380 L120 400 L190 330 L240 350 L300 300 L350 320 L420 250 L470 290 L520 260 L600 190 L650 240 L700 220 L760 160 L820 230 L880 200 L940 250 L1000 210 L1060 280 L1120 240 L1180 300 L1240 270 L1300 320 L1370 290 L1440 340 L1440 600 L0 600 Z',
  mid: 'M0 470 L80 440 L150 460 L220 400 L290 430 L360 380 L420 410 L500 340 L560 390 L640 330 L700 370 L780 300 L850 360 L920 330 L1000 380 L1070 350 L1140 400 L1210 370 L1290 420 L1360 390 L1440 430 L1440 600 L0 600 Z',
  near: 'M0 530 L90 500 L170 520 L260 470 L340 500 L430 450 L520 490 L620 440 L720 480 L820 430 L910 470 L1010 420 L1110 460 L1200 430 L1300 470 L1380 450 L1440 480 L1440 600 L0 600 Z',
  floor: 'M0 580 C240 560 480 590 720 570 C960 550 1200 580 1440 560 L1440 600 L0 600 Z',
  snowFar:
    'M420 250 L440 272 L470 290 L500 268 L520 260 L540 275 L600 190 L620 215 L650 240 L676 230 L700 220 L730 190 L760 160 L790 196 L820 230 L850 215 L880 200 L910 225 L940 250 L970 230 L1000 210 L1030 245 L1060 280 L1020 282 L980 262 L940 275 L900 250 L860 258 L820 262 L780 238 L740 240 L700 262 L660 275 L620 250 L580 240 L540 290 L500 302 L460 300 Z',
}

/** Ilustrácia sokola pre karty bez fotografie. */
const palettes: Record<Species, [string, string, string]> = {
  peregrine: ['#1b2433', '#3a4a66', '#8fc3ff'],
  saker: ['#2a2016', '#6b4a2a', '#e3202b'],
  gyr: ['#2b313a', '#8e98a8', '#f5f7fa'],
  'gyr-peregrine': ['#1e2733', '#5c6f8f', '#c7e1ff'],
  'gyr-saker': ['#2a241c', '#7b6447', '#ff8a90'],
  lanner: ['#2a1c14', '#7a4a2a', '#ffb98a'],
}

export function FalconArt({ species, name, className = '' }: { species: Species; name: string; className?: string }) {
  const [a, b, c] = palettes[species]
  const id = `fa-${species}-${name.replace(/\W/g, '')}`
  return (
    <svg viewBox="0 0 400 500" className={`h-full w-full ${className}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor={b} />
          <stop offset="1" stopColor={a} />
        </radialGradient>
        <linearGradient id={`${id}-ridge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.25" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={c} stopOpacity="0.55" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-bg)`} />
      <circle cx="200" cy="200" r="150" fill={`url(#${id}-sun)`} />
      <circle cx="200" cy="200" r="118" fill="none" stroke={c} strokeOpacity="0.25" />
      <circle cx="200" cy="200" r="88" fill="none" stroke={c} strokeOpacity="0.15" />
      <g transform="translate(200 205) scale(2.4)">
        <path d={FALCON_PATH} fill={c} />
      </g>
      <path d="M0 420 L60 380 L120 400 L190 330 L240 350 L300 300 L350 320 L400 260 L400 500 L0 500 Z" fill={`url(#${id}-ridge)`} />
      <path d="M0 460 L80 430 L150 450 L220 395 L290 425 L360 380 L400 405 L400 500 L0 500 Z" fill={a} opacity="0.85" />
    </svg>
  )
}
