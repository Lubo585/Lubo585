import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'sk' | 'en'
export type Localized = { sk: string; en: string }

type LangCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (v: Localized) => string
}

const Ctx = createContext<LangCtx>({ lang: 'sk', setLang: () => {}, t: (v) => v.sk })

function initial(): Lang {
  try {
    const saved = localStorage.getItem('fv-lang')
    if (saved === 'sk' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('sk') || navigator.language?.toLowerCase().startsWith('cs') ? 'sk' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('fv-lang', l)
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const value = useMemo<LangCtx>(() => ({ lang, setLang, t: (v) => v[lang] }), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang() {
  return useContext(Ctx)
}
