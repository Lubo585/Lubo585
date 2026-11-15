/** Spojí názvy tried, prázdne hodnoty vynechá. */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
