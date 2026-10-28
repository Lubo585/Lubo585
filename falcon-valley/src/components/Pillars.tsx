import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { HeartHandshake, Mountain, Plane, Scale, ShieldCheck, Video, type LucideIcon } from 'lucide-react'
import type { MouseEvent } from 'react'
import { pillars } from '../content/site'
import { useLang } from '../lib/lang'
import { Reveal } from '../lib/Reveal'
import { Container, SectionHeader } from '../lib/Section'

const icons: Record<string, LucideIcon> = { HeartHandshake, Mountain, Plane, Scale, ShieldCheck, Video }

function TiltCard({ icon, title, text, i }: { icon: string; title: string; text: string; i: number }) {
  const reduced = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, { stiffness: 150, damping: 20 })
  const sy = useSpring(py, { stiffness: 150, damping: 20 })
  const rx = useTransform(sy, [0, 1], [6, -6])
  const ry = useTransform(sx, [0, 1], [-6, 6])
  const glow = useTransform([sx, sy], ([x, y]) => `radial-gradient(400px circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(143,195,255,0.14), transparent 60%)`)
  const Icon = icons[icon] ?? Mountain

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <Reveal delay={i % 3} className="[perspective:1000px]">
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={reset}
        style={{ rotateX: reduced ? 0 : rx, rotateY: reduced ? 0 : ry }}
        className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-night-2 p-7 transition-colors hover:border-white/20"
      >
        <motion.div style={{ background: glow }} className="pointer-events-none absolute inset-0" />
        <div className="relative">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-glacier ring-1 ring-white/10">
            <Icon size={20} />
          </span>
          <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-snow">{title}</h3>
          <p className="mt-2 text-base leading-relaxed text-mist">{text}</p>
        </div>
      </motion.div>
    </Reveal>
  )
}

export default function Pillars() {
  const { t } = useLang()
  return (
    <section className="relative bg-night">
      <Container className="py-24 sm:py-32">
        <SectionHeader eyebrow={t(pillars.eyebrow)} title={t(pillars.title)} />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.items.map((p, i) => (
            <TiltCard key={i} i={i} icon={p.icon} title={t(p.title)} text={t(p.text)} />
          ))}
        </div>
      </Container>
    </section>
  )
}
