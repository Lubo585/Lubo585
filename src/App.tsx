import SmoothScroll from './lib/SmoothScroll'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import Services from './components/Services'
import Trades from './components/Trades'
import Gallery from './components/Gallery'
import Why from './components/Why'
import Process from './components/Process'
import Stats from './components/Stats'
import References from './components/References'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <Trades />
        <Gallery />
        <Why />
        <Process />
        <Stats />
        <References />
        <Contact />
      </main>
      <Footer />
    </SmoothScroll>
  )
}
