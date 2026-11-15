// Základné stavebné prvky rozhrania.

import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { num, parseNum } from '../lib/format'
import { cx } from './cx'


// ───────────────────────── Karta ─────────────────────────

interface CardProps {
  title?: ReactNode
  hint?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
}

export function Card({ title, hint, action, children, className, pad = true }: CardProps) {
  return (
    <section className={cx('card rounded-xl border border-line bg-surface shadow-[var(--shadow)]', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold leading-snug text-ink">{title}</h2>}
            {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
          </div>
          {action && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={pad ? 'p-4 sm:p-5' : title || action ? 'pt-3' : ''}>{children}</div>
    </section>
  )
}

// ───────────────────────── Ukazovateľ ─────────────────────────

type Tone = 'neutral' | 'good' | 'warn' | 'crit' | 'accent'

interface StatProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
}

const toneText: Record<Tone, string> = {
  neutral: 'text-ink',
  good: 'text-good-ink',
  warn: 'text-warn-ink',
  crit: 'text-crit-ink',
  accent: 'text-accent',
}

export function Stat({ label, value, sub, tone = 'neutral' }: StatProps) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-[var(--shadow)]">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className={cx('mt-1 text-[22px] font-semibold leading-tight tracking-tight', toneText[tone])}>{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-ink-2">{sub}</div>}
    </div>
  )
}

// ───────────────────────── Tlačidlá ─────────────────────────

interface ButtonProps {
  children?: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md'
  icon?: ReactNode
  title?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function Button({ children, onClick, variant = 'ghost', size = 'md', icon, title, disabled, type = 'button' }: ButtonProps) {
  const base = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
  const sizes = size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-[13.5px]'
  const variants = {
    primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
    ghost: 'border border-line-2 bg-surface text-ink hover:bg-surface-2',
    soft: 'bg-accent-soft text-accent hover:brightness-95',
    danger: 'border border-line-2 bg-surface text-crit-ink hover:bg-crit-soft',
  }[variant]
  return (
    <button type={type} onClick={onClick} title={title} aria-label={!children ? title : undefined} disabled={disabled} className={cx(base, sizes, variants)}>
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ onClick, title, children, tone }: { onClick: () => void; title: string; children: ReactNode; tone?: 'crit' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cx(
        'no-print inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-surface-2',
        tone === 'crit' ? 'hover:text-crit-ink' : 'hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

// ───────────────────────── Štítky ─────────────────────────

const badgeTone: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  good: 'bg-good-soft text-good-ink',
  warn: 'bg-warn-soft text-warn-ink',
  crit: 'bg-crit-soft text-crit-ink',
  accent: 'bg-accent-soft text-accent',
}

export function Badge({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium', badgeTone[tone])}>
      {children}
    </span>
  )
}

// ───────────────────────── Formulár ─────────────────────────

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block min-w-0', className)}>
      <span className="mb-1 block text-[12.5px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  )
}

interface TextProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'month'
  cell?: boolean
  ariaLabel?: string
}

export function TextInput({ value, onChange, placeholder, type = 'text', cell, ariaLabel }: TextProps) {
  return (
    <input
      className={cell ? 'cell' : 'inp'}
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TextArea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <textarea className="inp" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

/** Viacriadkové pole v zozname: výška sa prispôsobí dĺžke textu, takže dlhé poznámky sú čitateľné celé. */
export function AutoText({ value, onChange, placeholder, ariaLabel, perRow = 90 }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; perRow?: number }) {
  const rows = Math.max(1, value.split('\n').reduce((a, line) => a + Math.max(1, Math.ceil(line.length / perRow)), 0))
  return (
    <textarea
      className="cell resize-none py-1 leading-snug"
      style={{ height: 'auto', fieldSizing: 'content' } as React.CSSProperties}
      rows={rows}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface NumProps {
  value: number
  onChange: (v: number) => void
  decimals?: number
  cell?: boolean
  min?: number
  max?: number
  ariaLabel?: string
  suffix?: string
}

/** Číselné pole: počas písania drží text, hodnotu potvrdí pri opustení poľa alebo Enterom. */
export function NumInput({ value, onChange, decimals = 0, cell, min, max, ariaLabel, suffix }: NumProps) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? num(value, decimals)
  const commit = () => {
    if (text === null) return
    let v = parseNum(text)
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    setText(null)
    if (v !== value) onChange(v)
  }
  const input = (
    <input
      className={cell ? 'cell num' : 'inp text-right tabular-nums'}
      style={suffix && !cell ? { paddingRight: 16 + suffix.length * 7 } : undefined}
      inputMode="decimal"
      value={shown}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setText(String(Math.round(value * 10 ** Math.max(decimals, 2)) / 10 ** Math.max(decimals, 2)).replace('.', ','))
        const el = e.target
        window.setTimeout(() => el.select(), 0)
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setText(null)
      }}
    />
  )
  if (!suffix || cell) return input
  return (
    <span className="relative block">
      {input}
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[12.5px] text-muted">{suffix}</span>
    </span>
  )
}

interface SelectProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  cell?: boolean
  ariaLabel?: string
  /** true = šírka podľa obsahu (napr. filter v hlavičke karty) */
  auto?: boolean
}

export function Select<T extends string>({ value, onChange, options, cell, ariaLabel, auto }: SelectProps<T>) {
  return (
    <select className={cx(cell ? 'cell' : 'inp', auto && 'w-auto max-w-full')} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px]">
      <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// ───────────────────────── Záložky ─────────────────────────

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-print -mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={cx(
            'h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 text-[13.5px] font-medium transition-colors',
            t.id === value ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-surface-2',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────── Modálne okno ─────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('sheet flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-2xl outline-none sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-xl')}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-[15px] font-semibold">{title}</h2>
          <IconButton onClick={onClose} title="Zavrieť"><X size={16} /></IconButton>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

// ───────────────────────── Drobnosti ─────────────────────────

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-2 px-6 py-10 text-center">
      <div className="text-[14.5px] font-semibold">{title}</div>
      {text && <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">{text}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Note({ tone = 'neutral', children, title }: { tone?: 'neutral' | 'warn' | 'accent' | 'crit'; children: ReactNode; title?: string }) {
  const tones = {
    neutral: 'border-line bg-surface-2 text-ink-2',
    warn: 'border-transparent bg-warn-soft text-warn-ink',
    accent: 'border-transparent bg-accent-soft text-ink',
    crit: 'border-transparent bg-crit-soft text-crit-ink',
  }[tone]
  return (
    <div className={cx('rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed', tones)}>
      {title && <div className="mb-0.5 font-semibold">{title}</div>}
      {children}
    </div>
  )
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-[13.5px] text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Ukazovateľ plnenia: jedna hodnota oproti celku. */
export function Meter({ value, max, tone = 'accent', label }: { value: number; max: number; tone?: 'accent' | 'good' | 'warn' | 'crit'; label?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const fill = { accent: 'var(--s1)', good: 'var(--good)', warn: 'var(--warn)', crit: 'var(--crit)' }[tone]
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full"
      style={{ background: `color-mix(in srgb, ${fill} 18%, var(--surface-2))` }}
    >
      <div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: fill }} />
    </div>
  )
}

export function Dl({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-[minmax(140px,220px)_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
