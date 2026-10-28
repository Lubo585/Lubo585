import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { photos } from '../content/photos'
import { gallery } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container, SectionHeader } from '../lib/Section'

const ease = [0.22, 1, 0.36, 1] as const

/** Galéria fotografií Tatier. Zobrazí sa len vtedy, keď je aspoň jedna fotka stiahnutá. */
export default function Gallery() {
  const { t } = useLang()
  const [ok, setOk] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    photos.gallery.forEach((p) => {
      const img = new Image()
      img.onload = () => alive && setOk((v) => (v.includes(p.src) ? v : [...v, p.src]))
      img.src = p.src
    })
    return () => {
      alive = false
    }
  }, [])

  const items = photos.gallery.filter((p) => ok.includes(p.src))
  if (items.length === 0) return null

  return (
    <section id="gallery" className="relative bg-night-2">
      <Container className="py-24 sm:py-32">
        <SectionHeader eyebrow={t(gallery.eyebrow)} title={t(gallery.title)} subtitle={t(gallery.subtitle)} />
        <div className="mt-14 grid auto-rows-[220px] gap-4 sm:auto-rows-[260px] sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p, i) => {
            const wide = i % 6 === 0 || i % 6 === 3
            return (
              <Reveal key={p.src} delay={i % 4} className={`${wide ? 'sm:col-span-2' : ''} ${i % 6 === 0 ? 'lg:row-span-2' : ''}`}>
                <motion.figure
                  whileHover="hover"
                  className="group relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-night"
                >
                  <motion.img
                    src={p.src}
                    alt={t(p.alt)}
                    loading="lazy"
                    variants={{ hover: { scale: 1.06 } }}
                    transition={{ duration: 1.2, ease }}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-5">
                    <span className="font-display text-lg font-semibold tracking-tight text-snow">{t(p.caption)}</span>
                    {p.credit && <span className="mt-0.5 block text-[11px] text-snow/50">© {p.credit}</span>}
                  </figcaption>
                </motion.figure>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
