// Web Audio API Sound Synthesizer - zero external asset dependencies
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playJumpSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.15)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.18)
  } catch (e) {
    console.warn(e)
  }
}

export function playCoinSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.setValueAtTime(880, now + 0.08) // A5
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } catch (e) {
    console.warn(e)
  }
}

export function playPotatoPassSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.linearRampToValueAtTime(600, now + 0.1)
    osc.frequency.linearRampToValueAtTime(200, now + 0.2)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  } catch (e) {
    console.warn(e)
  }
}

export function playExplosionSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    // Noise buffer for explosion
    const bufferSize = ctx.sampleRate * 0.6
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15))
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    noise.start()
  } catch (e) {
    console.warn(e)
  }
}

export function playCheckpointSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const now = ctx.currentTime
    const notes = [440, 554.37, 659.25]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)
      gain.gain.setValueAtTime(0.18, now + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.25)
    })
  } catch (e) {
    console.warn(e)
  }
}

export function playCountdownTick() {
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    const now = ctx.currentTime
    osc.frequency.setValueAtTime(800, now)
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  } catch (e) {
    console.warn(e)
  }
}
