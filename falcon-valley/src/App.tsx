import { useCallback, useState } from 'react'
import type { Falcon } from './content/falcons'
import { LangProvider } from './lib/lang'
import SmoothScroll from './lib/SmoothScroll'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Hooks from './components/Hooks'
import Story from './components/Story'
import Pillars from './components/Pillars'
import Collection from './components/Collection'
import Shop from './components/Shop'
import Process from './components/Process'
import Valley from './components/Valley'
import Gallery from './components/Gallery'
import Contact from './components/Contact'
import Footer from './components/Footer'
import FalconModal from './components/FalconModal'

export default function App() {
  const [open, setOpen] = useState<Falcon | null>(null)
  const close = useCallback(() => setOpen(null), [])
  return (
    <LangProvider>
      <SmoothScroll>
        <Navbar />
        <main>
          <Hero />
          <Hooks />
          <Story />
          <Pillars />
          <Collection onOpen={setOpen} />
          <Shop onOpen={setOpen} />
          <Process />
          <Valley />
          <Gallery />
          <Contact />
        </main>
        <Footer />
        <FalconModal falcon={open} onClose={close} />
      </SmoothScroll>
    </LangProvider>
  )
}
