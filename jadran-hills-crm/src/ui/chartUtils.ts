// Farby sérií (kategorická paleta v pevnom poradí) a pomocné výpočty pre grafy.

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)']

/** Zaokrúhlené hodnoty osi pokrývajúce rozsah [min, max]. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (min === max) {
    if (min === 0) return [0, 1]
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  const span = max - min
  const raw = span / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  return ticks
}
