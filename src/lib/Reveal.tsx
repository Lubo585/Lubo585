import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { ease, fadeUp } from './variants'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
  as?: 'div' | 'section' | 'p' | 'h2' | 'h3' | 'li' | 'span'
}

export function Reveal({ children, className, delay = 0, once = true, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  const Tag = motion[as]
  if (reduced) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: '-10% 0px -10% 0px' }}
      variants={fadeUp}
      custom={delay}
    >
      {children}
    </Tag>
  )
}

export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduced = useReducedMotion()
  const words = text.split(' ')
  if (reduced) return <span className={className}>{text}</span>
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 3 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.06 }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}
