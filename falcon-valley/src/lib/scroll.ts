import type Lenis from 'lenis'

let lenisInstance: Lenis | null = null

export function setLenis(l: Lenis | null) {
  lenisInstance = l
}

export function getLenis() {
  return lenisInstance
}

export function scrollTo(target: string | HTMLElement, offset = -80) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset, duration: 1.4 })
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
  } else {
    target.scrollIntoView({ behavior: 'smooth' })
  }
}
