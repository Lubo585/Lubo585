import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import type React from 'react'
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

export function SplitWords({
  text,
  className,
  delay = 0,
  inView = false,
}: {
  text: string
  className?: string
  delay?: number
  inView?: boolean
}) {
  const reduced = useReducedMotion()
  const words = text.split(' ')
  if (reduced) return <span className={className}>{text}</span>
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', rotate: 2 }}
            {...(inView
              ? { whileInView: { y: 0, rotate: 0 }, viewport: { once: true, margin: '-10% 0px' } }
              : { animate: { y: 0, rotate: 0 } })}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.06 }}
          >
            {w}
          </motion.span>
        </span>
      )).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ' ', el]), [])}
    </span>
  )
}
