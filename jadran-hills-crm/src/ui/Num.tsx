import { useCountUp } from './motion'

/** Číslo, ktoré sa pri zobrazení a pri každej zmene plynulo dopočíta k novej hodnote. */
export function Num({ value, format, ms }: { value: number; format: (n: number) => string; ms?: number }) {
  const shown = useCountUp(value, ms)
  return <span className="tabular-nums">{format(shown)}</span>
}
