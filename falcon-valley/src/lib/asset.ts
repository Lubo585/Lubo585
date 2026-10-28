/** Cesta k súboru z priečinka public/ – funguje v koreni domény aj v podpriečinku. */
export function asset(path: string) {
  const base = import.meta.env.BASE_URL || './'
  return base.replace(/\/?$/, '/') + path.replace(/^\//, '')
}
