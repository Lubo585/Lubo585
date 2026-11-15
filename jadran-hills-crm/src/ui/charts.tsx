// Grafy kreslené priamo v SVG / HTML – bez externej knižnice.
// Pravidlá: tenké značky, vlasové mriežky, jedna os, farba nesie identitu série
// a text zostáva vo farbách textu. Každý graf má legendu (pri ≥ 2 sériách),
// tooltip pri ukázaní aj pri ovládaní klávesnicou a hodnoty sú dostupné aj v tabuľkách.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { axisShort } from '../lib/format'
import { niceTicks } from './chartUtils'

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

// ───────────────────────── Legenda a tooltip ─────────────────────────

export interface LegendItem {
  label: string
  color: string
  kind?: 'line' | 'rect'
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12.5px] text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={it.kind === 'line' ? 'inline-block h-[3px] w-3.5 rounded-full' : 'inline-block h-2.5 w-2.5 rounded-[3px]'}
            style={{ background: it.color }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  )
}

interface TipRow {
  label: string
  value: string
  color?: string
}

function Tip({ x, width, title, rows }: { x: number; width: number; title: string; rows: TipRow[] }) {
  const right = x > width / 2
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-1 z-10 min-w-[150px] max-w-[260px] rounded-lg border border-line-2 bg-surface px-2.5 py-2 text-[12.5px] shadow-lg"
      style={right ? { right: Math.max(0, width - x + 10) } : { left: x + 10 }}
    >
      <div className="mb-1 font-medium text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
            {r.color && <span aria-hidden className="inline-block h-[3px] w-3 shrink-0 rounded-full" style={{ background: r.color }} />}
            <span className="truncate">{r.label}</span>
          </span>
          <span className="font-semibold tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────── Spoločný rám pre grafy s časovou osou ─────────────────────────

export interface Series {
  name: string
  color: string
  values: number[]
}

interface XYProps {
  labels: string[]
  series: Series[]
  format: (v: number) => string
  height?: number
  ariaLabel: string
  /** Index, ktorý sa má zvýrazniť zvislou čiarou (napr. aktuálny mesiac). */
  marker?: { index: number; label: string }
}

const M = { l: 52, r: 14, t: 12, b: 24 }

function useActive(count: number) {
  const [active, setActive] = useState<number | null>(null)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setActive((a) => {
        const cur = a ?? (e.key === 'ArrowRight' ? -1 : count)
        return Math.max(0, Math.min(count - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))
      })
    } else if (e.key === 'Escape') setActive(null)
  }
  return { active, setActive, onKey }
}

function xLabelStep(n: number, plotW: number): number {
  const maxLabels = Math.max(2, Math.floor(plotW / 54))
  return Math.max(1, Math.ceil(n / maxLabels))
}

// ───────────────────────── Čiarový graf ─────────────────────────

export function LineChart({ labels, series, format, height = 240, ariaLabel, marker }: XYProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = labels.length
  const { active, setActive, onKey } = useActive(n)
  const plotW = Math.max(10, width - M.l - M.r)
  const plotH = height - M.t - M.b

  const { ticks, y } = useMemo(() => {
    const all = series.flatMap((s) => s.values)
    const t = niceTicks(Math.min(0, ...all), Math.max(0, ...all))
    const lo = t[0]
    const hi = t[t.length - 1]
    return { ticks: t, y: (v: number) => M.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH }
  }, [series, plotH])
  const x = (i: number) => M.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const step = xLabelStep(n, plotW)

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    setActive(Math.max(0, Math.min(n - 1, Math.round(((px - M.l) / plotW) * (n - 1)))))
  }

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2">
          <Legend items={series.map((s) => ({ label: s.name, color: s.color, kind: 'line' }))} />
        </div>
      )}
      <div ref={ref} className="relative" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)} role="img" aria-label={`${ariaLabel}. Šípkami vľavo a vpravo prechádzate jednotlivé mesiace.`}>
        {width > 0 && (
          <svg width={width} height={height} onPointerMove={move} onPointerLeave={() => setActive(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
                <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {axisShort(t)}
                </text>
              </g>
            ))}
            {labels.map((l, i) =>
              i % step === 0 ? (
                <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {l}
                </text>
              ) : null,
            )}
            {marker && marker.index >= 0 && marker.index < n && (
              <g>
                <line x1={x(marker.index)} x2={x(marker.index)} y1={M.t} y2={M.t + plotH} stroke="var(--axis)" strokeWidth={1} />
                <text x={x(marker.index) + 4} y={M.t + 9} fontSize={11} fill="var(--muted)">
                  {marker.label}
                </text>
              </g>
            )}
            {series.map((s, si) => (
              <g key={s.name}>
                {si === 0 && series.length === 1 && (
                  <g className="chart-area">
                    <path d={`M${x(0)},${y(0)} ${s.values.map((v, i) => `L${x(i)},${y(v)}`).join(' ')} L${x(n - 1)},${y(0)} Z`} fill={s.color} opacity={0.1} />
                  </g>
                )}
                <polyline
                  className="chart-line"
                  pathLength={1}
                  style={{ animationDelay: `${si * 140}ms` }}
                  points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {n > 0 && <circle className="chart-dot" cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />}
              </g>
            ))}
            {active !== null && (
              <g>
                <line x1={x(active)} x2={x(active)} y1={M.t} y2={M.t + plotH} stroke="var(--ink-2)" strokeWidth={1} />
                {series.map((s) => (
                  <circle key={s.name} cx={x(active)} cy={y(s.values[active] ?? 0)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tip x={x(active)} width={width} title={labels[active]} rows={series.map((s) => ({ label: s.name, value: format(s.values[active] ?? 0), color: s.color }))} />
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Stĺpcový graf (skladaný alebo ± okolo nuly) ─────────────────────────

interface ColumnProps extends XYProps {
  /** stacked = série naskladané nad sebou; diverging = jedna séria, farba podľa znamienka. */
  mode: 'stacked' | 'diverging'
  posLabel?: string
  negLabel?: string
}

export function ColumnChart({ labels, series, format, height = 240, ariaLabel, mode, posLabel = 'Kladné', negLabel = 'Záporné', marker }: ColumnProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const n = labels.length
  const { active, setActive, onKey } = useActive(n)
  const plotW = Math.max(10, width - M.l - M.r)
  const plotH = height - M.t - M.b
  const band = plotW / Math.max(1, n)
  const barW = Math.max(2, Math.min(24, band - 2))

  const totals = useMemo(() => labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0)), [labels, series])
  const { ticks, y } = useMemo(() => {
    const vals = mode === 'stacked' ? totals : (series[0]?.values ?? [])
    const t = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals))
    const lo = t[0]
    const hi = t[t.length - 1]
    return { ticks: t, y: (v: number) => M.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH }
  }, [mode, totals, series, plotH])
  const cx = (i: number) => M.l + band * (i + 0.5)
  const step = xLabelStep(n, plotW)

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setActive(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left - M.l) / band))))
  }

  /** Stĺpec so zaobleným koncom na strane údaja a rovnou hranou pri základni. */
  const bar = (xc: number, v0: number, v1: number, fill: string, key: string, roundEnd: boolean, delay = 0) => {
    const yTop = Math.min(y(v0), y(v1))
    const h = Math.abs(y(v0) - y(v1))
    if (h < 0.5) return null
    const r = roundEnd ? Math.min(4, barW / 2, h) : 0
    const x0 = xc - barW / 2
    const up = v1 >= v0
    const d = up
      ? `M${x0},${yTop + h} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${yTop + h} Z`
      : `M${x0},${yTop} V${yTop + h - r} Q${x0},${yTop + h} ${x0 + r},${yTop + h} H${x0 + barW - r} Q${x0 + barW},${yTop + h} ${x0 + barW},${yTop + h - r} V${yTop} Z`
    return <path key={key} className={up ? 'chart-bar' : 'chart-bar down'} style={{ animationDelay: `${delay}ms` }} d={d} fill={fill} />
  }

  const legend: LegendItem[] =
    mode === 'stacked'
      ? series.map((s) => ({ label: s.name, color: s.color }))
      : [
          { label: posLabel, color: 'var(--pos)' },
          { label: negLabel, color: 'var(--neg)' },
        ]

  return (
    <div>
      <div className="mb-2">
        <Legend items={legend} />
      </div>
      <div ref={ref} className="relative" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)} role="img" aria-label={`${ariaLabel}. Šípkami vľavo a vpravo prechádzate jednotlivé mesiace.`}>
        {width > 0 && (
          <svg width={width} height={height} onPointerMove={move} onPointerLeave={() => setActive(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--axis)' : 'var(--grid)'} strokeWidth={1} />
                <text x={M.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {axisShort(t)}
                </text>
              </g>
            ))}
            {active !== null && <rect x={M.l + band * active} y={M.t} width={band} height={plotH} fill="var(--ink)" opacity={0.06} />}
            {labels.map((l, i) => {
              const parts: ReactNode[] = []
              if (mode === 'diverging') {
                const v = series[0]?.values[i] ?? 0
                parts.push(bar(cx(i), 0, v, v >= 0 ? 'var(--pos)' : 'var(--neg)', 'b', true, Math.min(i * 14, 700)))
              } else {
                let acc = 0
                const present = series.filter((s) => (s.values[i] ?? 0) > 0)
                present.forEach((s, k) => {
                  const v = s.values[i] ?? 0
                  // 2 px medzera vo farbe podkladu oddeľuje naskladané segmenty
                  const gap = k > 0 ? (2 / plotH) * (ticks[ticks.length - 1] - ticks[0]) : 0
                  parts.push(bar(cx(i), acc + gap, acc + v, s.color, s.name, k === present.length - 1, Math.min(i * 14, 700)))
                  acc += v
                })
              }
              return (
                <g key={i}>
                  {parts}
                  {i % step === 0 && (
                    <text x={cx(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">
                      {l}
                    </text>
                  )}
                </g>
              )
            })}
            {marker && marker.index >= 0 && marker.index < n && (
              <g>
                <line x1={cx(marker.index)} x2={cx(marker.index)} y1={M.t} y2={M.t + plotH} stroke="var(--axis)" strokeWidth={1} />
                <text x={cx(marker.index) + 4} y={M.t + 9} fontSize={11} fill="var(--muted)">
                  {marker.label}
                </text>
              </g>
            )}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tip
            x={cx(active)}
            width={width}
            title={labels[active]}
            rows={
              mode === 'diverging'
                ? [{ label: series[0]?.name ?? '', value: format(series[0]?.values[active] ?? 0), color: (series[0]?.values[active] ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }]
                : [
                    ...series.filter((s) => (s.values[active] ?? 0) !== 0).map((s) => ({ label: s.name, value: format(s.values[active] ?? 0), color: s.color })),
                    { label: 'Spolu', value: format(totals[active]) },
                  ]
            }
          />
        )}
      </div>
    </div>
  )
}

// ───────────────────────── Zoradené vodorovné pruhy ─────────────────────────

export interface BarRow {
  label: string
  value: number
  sub?: string
}

export function BarList({ rows, format, color = 'var(--s1)', colors }: { rows: BarRow[]; format: (v: number) => string; color?: string; colors?: string[] }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)))
  return (
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="min-w-0 truncate text-ink-2" title={r.label}>
            {r.label}
            {r.sub && <span className="ml-1.5 text-muted">{r.sub}</span>}
          </span>
          <span className="font-semibold tabular-nums">{format(r.value)}</span>
          <span
            className="bar-x col-span-2 block h-2 rounded-r-[4px] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(0.5, (Math.abs(r.value) / max) * 100)}%`, background: colors?.[i] ?? color, animationDelay: `${i * 60}ms` }}
          />
        </li>
      ))}
    </ul>
  )
}

// ───────────────────────── Segmentovaný pruh (celok rozdelený na časti) ─────────────────────────

export interface Part {
  label: string
  value: number
  color: string
  /** true = tmavý text na svetlej výplni (žltá) */
  darkText?: boolean
}

export function SegBar({ parts, format, ariaLabel }: { parts: Part[]; format: (v: number) => string; ariaLabel: string }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0)
  const shown = parts.filter((p) => p.value > 0)
  const [active, setActive] = useState<number | null>(null)
  if (total <= 0) return <div className="text-[13px] text-muted">Zatiaľ bez údajov.</div>
  return (
    <div>
      <div className="relative">
        <div className="flex h-7 w-full gap-[2px]" role="img" aria-label={`${ariaLabel}: ${shown.map((p) => `${p.label} ${format(p.value)}`).join(', ')}`}>
          {shown.map((p, i) => {
            const share = p.value / total
            return (
              <div
                key={p.label}
                tabIndex={0}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="flex h-full min-w-[3px] items-center rounded-[4px] px-1.5 text-[12px] font-semibold outline-offset-2"
                style={{ width: `${share * 100}%`, background: p.color, color: p.darkText ? '#0b0b0b' : '#fff', filter: active === i ? 'brightness(1.08)' : undefined }}
              >
                {share >= 0.09 ? `${Math.round(share * 100)} %` : ''}
              </div>
            )
          })}
        </div>
        {active !== null && shown[active] && (
          <div className="pointer-events-none absolute left-0 top-9 z-10 rounded-lg border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] shadow-lg">
            <span className="text-ink-2">{shown[active].label}: </span>
            <span className="font-semibold tabular-nums">
              {format(shown[active].value)} · {Math.round((shown[active].value / total) * 100)} %
            </span>
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <Legend items={shown.map((p) => ({ label: `${p.label} · ${format(p.value)}`, color: p.color }))} />
      </div>
    </div>
  )
}
