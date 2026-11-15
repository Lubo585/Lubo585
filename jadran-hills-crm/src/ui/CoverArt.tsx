import { mediaSrc } from '../lib/media'
import type { MediaItem } from '../types'
import { cx } from './cx'
import { useImageOk } from './motion'

const WAVES = [
  'M0,250 C160,190 300,300 470,236 S760,150 940,214 S1120,268 1200,226',
  'M0,286 C180,232 330,330 520,270 S800,196 980,252 S1140,296 1200,266',
  'M0,318 C200,270 360,352 560,300 S840,240 1010,288 S1150,322 1200,302',
  'M0,214 C150,150 290,262 450,198 S730,104 910,170 S1110,236 1200,186',
  'M0,176 C140,112 270,220 420,158 S700,62 880,128 S1100,202 1200,146',
]

/** Náhradná kresba, kým projekt nemá vlastný obrázok: vrstevnice kopcov. */
function Hills({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" className={cx('hills', className)} aria-hidden>
      {WAVES.map((d, i) => (
        <path key={d} d={d} opacity={0.9 - i * 0.14} />
      ))}
    </svg>
  )
}

interface Props {
  item: MediaItem | null
  className?: string
  /** Zarovnanie čiarovej kresby v ploche. */
  position?: string
}

/**
 * Titulný obrázok projektu. Čiarová kresba sa farbí farbou textu (sedí vo svetlej
 * aj tmavej téme), fotografia vyplní plochu, bez obrázka sa ukáže náhradná kresba.
 */
export function CoverArt({ item, className, position = 'center' }: Props) {
  const src = item ? mediaSrc(item) : null
  const ok = useImageOk(src)
  if (!src || ok === 'error') return <Hills className={className} />
  if (ok === 'loading' || !item) return <div className={className} />
  if (item.line) {
    const url = `url("${src}")`
    return (
      <div
        role="img"
        aria-label={item.title}
        className={cx('lineart fade-in', className)}
        style={{ WebkitMaskImage: url, maskImage: url, WebkitMaskPosition: position, maskPosition: position }}
      />
    )
  }
  return <img src={src} alt={item.title} className={cx('fade-in object-cover', className)} />
}
