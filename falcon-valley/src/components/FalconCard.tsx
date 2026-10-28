import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { speciesLabel, statusLabel, type Falcon } from '../content/falcons'
import { shop } from '../content/site'
import { useLang } from '../lib/lang'
import { formatPrice, formatWeight } from '../lib/format'
import { FalconArt } from './Art'

const ease = [0.22, 1, 0.36, 1] as const

const statusTone: Record<Falcon['status'], string> = {
  available: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  reserved: 'bg-brand/15 text-brand-2 ring-brand/40',
  sold: 'bg-white/10 text-mist ring-white/15',
  breeding: 'bg-glacier/15 text-glacier-2 ring-glacier/30',
}

export function StatusBadge({ status, className = '' }: { status: Falcon['status']; className?: string }) {
  const { t } = useLang()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 backdrop-blur ${statusTone[status]} ${className}`}>
      {status === 'available' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      {t(statusLabel[status])}
    </span>
  )
}

export function FalconPhoto({ falcon, className = '' }: { falcon: Falcon; className?: string }) {
  const src = falcon.photos[0]
  return (
    <motion.div layoutId={`photo-${falcon.id}`} className={`relative overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt={falcon.name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <FalconArt species={falcon.species} name={falcon.name} />
      )}
    </motion.div>
  )
}

export default function FalconCard({ falcon, onOpen, light = false }: { falcon: Falcon; onOpen: (f: Falcon) => void; light?: boolean }) {
  const { lang, t } = useLang()
  const sp = speciesLabel[falcon.species]
  const sold = falcon.status === 'sold'

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ duration: 0.5, ease }}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border ${
        light ? 'border-night/8 bg-white shadow-[0_20px_60px_-30px_rgba(6,8,12,0.25)]' : 'border-white/10 bg-night-2'
      }`}
      onClick={() => onOpen(falcon)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(falcon)
        }
      }}
      aria-label={`${falcon.name} – ${t(shop.detail)}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <div className={`h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] ${sold ? 'grayscale' : ''}`}>
          <FalconPhoto falcon={falcon} className="h-full w-full" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <StatusBadge status={falcon.status} />
          {falcon.video && (
            <span className="rounded-full bg-night/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-snow backdrop-blur">
              {t(shop.labels.video)}
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent p-5 pt-16">
          <h3 className="font-display text-3xl font-semibold tracking-tight text-snow">{falcon.name}</h3>
          <p className="text-sm text-snow/75">
            {t(sp)} · <span className="italic">{sp.latin}</span>
          </p>
        </div>
      </div>

      <div className={`flex flex-1 flex-col p-5 ${light ? 'text-night' : 'text-snow'}`}>
        <dl className={`grid grid-cols-[1fr_1fr_auto] gap-3 text-sm ${light ? 'text-stone/80' : 'text-mist'}`}>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] opacity-70">{t(shop.labels.weight)}</dt>
            <dd className={`mt-0.5 font-semibold tabular-nums ${light ? 'text-night' : 'text-snow'}`}>{formatWeight(falcon.weightGrams, lang)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] opacity-70">{t(shop.labels.sex)}</dt>
            <dd className={`mt-0.5 font-semibold ${light ? 'text-night' : 'text-snow'}`}>{t(falcon.sex === 'male' ? shop.labels.male : shop.labels.female)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] opacity-70">{t(shop.labels.ring)}</dt>
            <dd className={`mt-0.5 whitespace-nowrap font-semibold tabular-nums ${light ? 'text-night' : 'text-snow'}`}>{falcon.ringNumber}</dd>
          </div>
        </dl>

        <div className={`mt-5 flex items-center justify-between border-t pt-4 ${light ? 'border-night/8' : 'border-white/10'}`}>
          <span className="font-display text-lg font-semibold tracking-tight">
            {falcon.status === 'breeding' ? t(statusLabel.breeding) : falcon.price ? formatPrice(falcon.price, lang) : t(shop.priceOnRequest)}
          </span>
          <span className={`inline-flex items-center gap-1 text-sm font-medium ${light ? 'text-brand-dark' : 'text-brand'}`}>
            {t(shop.detail)}
            <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
