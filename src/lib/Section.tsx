import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
}: {
  eyebrow: string
  title: string
  subtitle?: string
  align?: 'left' | 'center'
}) {
  const center = align === 'center'
  return (
    <div className={`max-w-3xl ${center ? 'mx-auto text-center' : ''}`}>
      <Reveal>
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber">
          <span className="h-px w-6 bg-amber" />
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={1} as="h2" className="mt-4 font-display text-3xl font-bold leading-[1.1] text-balance sm:text-4xl lg:text-5xl">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal delay={2} as="p" className="mt-5 text-base leading-relaxed text-mist sm:text-lg">
          {subtitle}
        </Reveal>
      )}
    </div>
  )
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 ${className}`}>{children}</div>
}
