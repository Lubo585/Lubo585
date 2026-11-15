// Úvodná zvučka: pôvodný krátky zvuk poskladaný priamo v prehliadači (Web Audio).
// Žiadna nahrávka – nábeh, hlboký úder, akord a doznenie sa generujú pri prehratí.

type Ctor = typeof AudioContext

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  try {
    const C = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) as Ctor | undefined
    ctx = C ? new C() : null
  } catch {
    ctx = null
  }
  return ctx
}

/**
 * Prehrá zvučku. Musí sa volať priamo z kliknutia – prehliadač inak zvuk nepovolí.
 * Vracia dĺžku v sekundách (0, ak zvuk nie je dostupný).
 */
export function playChime(volume = 0.6): number {
  const ac = context()
  if (!ac) return 0
  void ac.resume().catch(() => {})
  const t0 = ac.currentTime + 0.04

  const master = ac.createGain()
  master.gain.value = volume
  const limiter = ac.createDynamicsCompressor()
  limiter.threshold.value = -10
  limiter.ratio.value = 6
  master.connect(limiter)
  limiter.connect(ac.destination)

  // Priestor: jednoduchá ozvena so spätnou väzbou.
  const delay = ac.createDelay(1)
  delay.delayTime.value = 0.26
  const feedback = ac.createGain()
  feedback.gain.value = 0.3
  const wet = ac.createGain()
  wet.gain.value = 0.24
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(wet)
  wet.connect(master)
  const bus = ac.createGain()
  bus.connect(master)
  bus.connect(delay)

  const env = (g: GainNode, at: number, peak: number, attack: number, release: number) => {
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
  }

  // 1. Nábeh: dva mierne rozladené tóny stúpajú o oktávu cez otvárajúci sa filter.
  const sweep = ac.createBiquadFilter()
  sweep.type = 'lowpass'
  sweep.Q.value = 6
  sweep.frequency.setValueAtTime(180, t0)
  sweep.frequency.exponentialRampToValueAtTime(2600, t0 + 1.0)
  const sweepGain = ac.createGain()
  env(sweepGain, t0, 0.09, 0.7, 0.55)
  sweep.connect(sweepGain)
  sweepGain.connect(bus)
  for (const cents of [-8, 8]) {
    const o = ac.createOscillator()
    o.type = 'sawtooth'
    o.detune.value = cents
    o.frequency.setValueAtTime(55, t0)
    o.frequency.exponentialRampToValueAtTime(110, t0 + 1.0)
    o.connect(sweep)
    o.start(t0)
    o.stop(t0 + 1.4)
  }

  // 2. Šum, ktorý prejde od hlbokého k jasnému – pocit rozbehu.
  const len = Math.floor(ac.sampleRate * 1.3)
  const buffer = ac.createBuffer(1, len, ac.sampleRate)
  const ch = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1
  const noise = ac.createBufferSource()
  noise.buffer = buffer
  const band = ac.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.9
  band.frequency.setValueAtTime(320, t0)
  band.frequency.exponentialRampToValueAtTime(5200, t0 + 1.05)
  const noiseGain = ac.createGain()
  env(noiseGain, t0, 0.045, 0.8, 0.45)
  noise.connect(band)
  band.connect(noiseGain)
  noiseGain.connect(bus)
  noise.start(t0)
  noise.stop(t0 + 1.3)

  // 3. Hlboký úder v okamihu, keď sa nábeh zlomí do akordu.
  const hit = t0 + 0.98
  const sub = ac.createOscillator()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(82, hit)
  sub.frequency.exponentialRampToValueAtTime(46, hit + 0.4)
  const subGain = ac.createGain()
  env(subGain, hit, 0.32, 0.012, 0.55)
  sub.connect(subGain)
  subGain.connect(master)
  sub.start(hit)
  sub.stop(hit + 0.7)

  // 4. Akord: tóny nastupujú tesne po sebe a dlho doznievajú.
  const notes = [146.83, 220.0, 293.66, 369.99, 440.0, 659.25]
  notes.forEach((f, i) => {
    const at = hit + i * 0.055
    const g = ac.createGain()
    env(g, at, 0.085 / (1 + i * 0.22), 0.03, 2.3 - i * 0.12)
    g.connect(bus)
    const a = ac.createOscillator()
    a.type = 'sine'
    a.frequency.value = f
    a.connect(g)
    const b = ac.createOscillator()
    b.type = 'triangle'
    b.frequency.value = f
    b.detune.value = 5
    const soft = ac.createGain()
    soft.gain.value = 0.35
    b.connect(soft)
    soft.connect(g)
    for (const o of [a, b]) {
      o.start(at)
      o.stop(at + 2.6)
    }
  })

  // 5. Dva krátke vysoké tóny ako iskra na vrchole.
  ;[1760, 2637].forEach((f, i) => {
    const at = hit + 0.12 + i * 0.16
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ac.createGain()
    env(g, at, 0.028, 0.008, 0.6)
    o.connect(g)
    g.connect(bus)
    o.start(at)
    o.stop(at + 0.7)
  })

  return 3.6
}
