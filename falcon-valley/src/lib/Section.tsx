import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  tone = 'dark',
}: {
  eyebrow: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
}) {
  const center = align === 'center'
  const light = tone === 'light'
  return (
    <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
      <Reveal>
        <span
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] ${
            light ? 'text-brand-dark' : 'text-brand'
          }`}
        >
          <span className={`h-px w-6 ${light ? 'bg-brand-dark' : 'bg-brand'}`} />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal
        delay={1}
        as="h2"
        className={`mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl ${
          light ? 'text-night' : 'text-snow'
        }`}
      >
        {title}
      </Reveal>
      {subtitle && (
        <Reveal
          delay={2}
          as="p"
          className={`mt-5 text-lg leading-relaxed text-pretty sm:text-xl ${light ? 'text-stone/80' : 'text-mist'}`}
        >
          {subtitle}
        </Reveal>
      )}
    </div>
  )
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>
}
