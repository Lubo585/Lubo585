import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import { breeders, type Falcon } from '../content/falcons'
import { collection } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container, SectionHeader } from '../lib/Section'
import FalconCard from './FalconCard'

export default function Collection({ onOpen }: { onOpen: (f: Falcon) => void }) {
  const { t } = useLang()
  const track = useRef<HTMLDivElement>(null)
  const nudge = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * (track.current.clientWidth * 0.8), behavior: 'smooth' })

  return (
    <section id="collection" className="relative overflow-hidden bg-night-2">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-glacier/10 blur-[140px]" />
      <Container className="pt-24 sm:pt-32">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader eyebrow={t(collection.eyebrow)} title={t(collection.title)} subtitle={t(collection.subtitle)} />
          <Reveal className="hidden gap-2 lg:flex">
            <button onClick={() => nudge(-1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-snow transition hover:bg-white/5" aria-label="←">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => nudge(1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-snow transition hover:bg-white/5" aria-label="→">
              <ChevronRight size={18} />
            </button>
          </Reveal>
        </div>
      </Container>

      <div ref={track} className="hide-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-24 sm:px-8 lg:px-[max(3rem,calc((100vw-80rem)/2+3rem))] sm:pb-32" data-lenis-prevent>
        {breeders.map((f, i) => (
          <Reveal key={f.id} delay={i} className="w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[23rem]">
            <FalconCard falcon={f} onOpen={onOpen} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}
