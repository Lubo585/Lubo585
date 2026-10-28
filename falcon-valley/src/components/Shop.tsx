import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { forSale, speciesLabel, type Falcon, type Species } from '../content/falcons'
import { shop } from '../content/site'
import { useLang } from '../lib/lang'
import { Container, SectionHeader } from '../lib/Section'
import FalconCard from './FalconCard'

const ease = [0.22, 1, 0.36, 1] as const

export default function Shop({ onOpen }: { onOpen: (f: Falcon) => void }) {
  const { t } = useLang()
  const [species, setSpecies] = useState<Species | 'all'>('all')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const kinds = useMemo(() => Array.from(new Set(forSale.map((f) => f.species))), [])
  const list = useMemo(
    () => forSale.filter((f) => (species === 'all' || f.species === species) && (!onlyAvailable || f.status === 'available')),
    [species, onlyAvailable],
  )

  return (
    <section id="shop" className="relative bg-snow text-night">
      <Container className="py-24 sm:py-32">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t(shop.eyebrow)} title={t(shop.title)} subtitle={t(shop.subtitle)} tone="light" />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-2">
          {(['all', ...kinds] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSpecies(k)}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                species === k ? 'text-snow' : 'text-stone/70 hover:text-night'
              }`}
            >
              {species === k && <motion.span layoutId="species-pill" className="absolute inset-0 rounded-full bg-night" transition={{ duration: 0.45, ease }} />}
              <span className="relative">{k === 'all' ? t(shop.all) : t(speciesLabel[k])}</span>
            </button>
          ))}
          <label className="ml-auto inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-stone/80">
            <span>{t(shop.onlyAvailable)}</span>
            <span
              role="switch"
              aria-checked={onlyAvailable}
              tabIndex={0}
              onClick={() => setOnlyAvailable((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setOnlyAvailable((v) => !v)
                }
              }}
              className={`relative h-7 w-12 rounded-full transition ${onlyAvailable ? 'bg-emerald-500' : 'bg-night/15'}`}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${onlyAvailable ? 'left-6' : 'left-1'}`}
              />
            </span>
          </label>
        </div>

        <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease }}
              >
                <FalconCard falcon={f} onOpen={onOpen} light />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {list.length === 0 && <p className="mt-10 text-center text-stone/70">{t(shop.empty)}</p>}
      </Container>
    </section>
  )
}
