import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { speciesLabel, type Falcon } from '../content/falcons'
import { shop } from '../content/site'
import { useLang } from '../lib/lang'
import { formatDate, formatPrice, formatWeight, youtubeId } from '../lib/format'
import { getLenis, scrollTo } from '../lib/scroll'
import { FalconArt } from './Art'
import { StatusBadge } from './FalconCard'

const ease = [0.22, 1, 0.36, 1] as const

export function inquire(falcon: Falcon) {
  window.dispatchEvent(new CustomEvent('fv:inquire', { detail: falcon.id }))
  scrollTo('#contact', -40)
}

function Video({ video }: { video: NonNullable<Falcon['video']> }) {
  if (video.type === 'youtube') {
    const id = youtubeId(video.src)
    if (!id) return null
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return <video className="h-full w-full object-cover" src={video.src} poster={video.poster} controls playsInline preload="metadata" />
}

export default function FalconModal({ falcon, onClose }: { falcon: Falcon | null; onClose: () => void }) {
  const { lang, t } = useLang()
  const [index, setIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [shownId, setShownId] = useState<string | null>(null)
  if (falcon && falcon.id !== shownId) {
    setShownId(falcon.id)
    setIndex(0)
    setShowVideo(false)
  }

  useEffect(() => {
    if (!falcon) return
    const lenis = getLenis()
    lenis?.stop()
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (falcon.photos.length ? (i + 1) % falcon.photos.length : 0))
      if (e.key === 'ArrowLeft') setIndex((i) => (falcon.photos.length ? (i - 1 + falcon.photos.length) % falcon.photos.length : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      lenis?.start()
    }
  }, [falcon, onClose])

  const sp = falcon ? speciesLabel[falcon.species] : null
  const photos = falcon?.photos ?? []
  const hasPhotos = photos.length > 0

  const rows = falcon
    ? [
        [t(shop.labels.species), `${t(sp!)} (${sp!.latin})`],
        [t(shop.labels.sex), t(falcon.sex === 'male' ? shop.labels.male : shop.labels.female)],
        [t(shop.labels.hatched), formatDate(falcon.hatched, lang)],
        [t(shop.labels.weight), formatWeight(falcon.weightGrams, lang)],
        falcon.wingspanCm ? [t(shop.labels.wingspan), `${falcon.wingspanCm} cm`] : null,
        [t(shop.labels.origin), t(falcon.origin)],
        [t(shop.labels.ring), falcon.ringNumber],
        falcon.cites ? [t(shop.labels.cites), falcon.cites] : null,
        falcon.microchip ? [t(shop.labels.microchip), falcon.microchip] : null,
        falcon.parents ? [t(shop.labels.parents), [falcon.parents.sire, falcon.parents.dam].filter(Boolean).join(' × ')] : null,
      ].filter((r): r is [string, string] => Boolean(r))
    : []

  return (
    <AnimatePresence>
      {falcon && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-night/70 backdrop-blur-md sm:items-center sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={falcon.name}
        >
          <motion.div
            key={falcon.id}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.55, ease }}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="relative flex max-h-[94svh] w-full max-w-6xl flex-col overflow-y-auto rounded-t-[2rem] bg-night-2 text-snow ring-1 ring-white/10 sm:rounded-[2rem] lg:flex-row lg:overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-night/60 text-snow ring-1 ring-white/15 backdrop-blur transition hover:bg-night"
              aria-label={t(shop.labels.close)}
            >
              <X size={18} />
            </button>

            {/* media */}
            <div className="relative shrink-0 lg:w-[55%] lg:overflow-y-auto" data-lenis-prevent>
              <div className="relative aspect-[4/5] bg-night sm:aspect-[4/3] lg:aspect-[4/5]">
                {showVideo && falcon.video ? (
                  <Video video={falcon.video} />
                ) : hasPhotos ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={photos[index]}
                      src={photos[index]}
                      alt={`${falcon.name} ${index + 1}`}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </AnimatePresence>
                ) : (
                  <motion.div layoutId={`photo-${falcon.id}`} className="absolute inset-0">
                    <FalconArt species={falcon.species} name={falcon.name} />
                    <span className="absolute bottom-5 left-5 rounded-full bg-night/50 px-3 py-1 text-xs text-snow/80 backdrop-blur">
                      {t(shop.labels.noPhotos)}
                    </span>
                  </motion.div>
                )}

                {!showVideo && photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-night/50 p-2 text-snow backdrop-blur hover:bg-night/80"
                      aria-label={t(shop.labels.prev)}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setIndex((i) => (i + 1) % photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-night/50 p-2 text-snow backdrop-blur hover:bg-night/80"
                      aria-label={t(shop.labels.next)}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {(photos.length > 1 || falcon.video) && (
                <div className="flex gap-2 overflow-x-auto p-4 hide-scrollbar">
                  {photos.map((p, i) => (
                    <button
                      key={p}
                      onClick={() => {
                        setShowVideo(false)
                        setIndex(i)
                      }}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                        !showVideo && index === i ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {falcon.video && (
                    <button
                      onClick={() => setShowVideo(true)}
                      className={`inline-flex h-16 shrink-0 items-center gap-2 rounded-xl bg-white/5 px-4 text-sm font-medium ring-2 transition ${
                        showVideo ? 'ring-brand' : 'ring-transparent hover:bg-white/10'
                      }`}
                    >
                      <Play size={16} className="text-brand" />
                      {t(shop.labels.video)}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* details */}
            <div className="flex flex-1 flex-col p-6 sm:p-8 lg:overflow-y-auto" data-lenis-prevent>
              <StatusBadge status={falcon.status} className="self-start" />
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{falcon.name}</h2>
              <p className="mt-1 text-mist">
                {t(sp!)} · <span className="italic">{sp!.latin}</span>
              </p>

              {falcon.traits && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {falcon.traits.map((tr, i) => (
                    <span key={i} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-snow/90">
                      {t(tr)}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-6 text-base leading-relaxed text-mist text-pretty">{t(falcon.description)}</p>

              <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                    <dt className="text-mist">{k}</dt>
                    <dd className="font-medium tabular-nums text-snow">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <span className="font-display text-3xl font-semibold tracking-tight">
                  {falcon.status === 'breeding' ? '' : falcon.price ? formatPrice(falcon.price, lang) : t(shop.priceOnRequest)}
                </span>
                {falcon.status !== 'sold' && falcon.status !== 'breeding' && (
                  <button
                    onClick={() => {
                      onClose()
                      inquire(falcon)
                    }}
                    className="rounded-full bg-brand px-6 py-3 text-base font-semibold text-night transition hover:bg-brand-2"
                  >
                    {t(shop.inquire)}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
