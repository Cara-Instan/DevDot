/**
 * Web Audio API 8-Bit Retro Sound Synthesizer
 * Zero external audio files required. Generates charming bleeps, chimes, and fanfares natively.
 */

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function playRetroBeep(
  freqs: number[],
  type: OscillatorType = 'square',
  noteDuration: number = 0.08,
  volume: number = 0.15
) {
  const ctx = getAudioContext()
  if (!ctx || volume <= 0) return

  const now = ctx.currentTime
  freqs.forEach((freq, idx) => {
    const startTime = now + idx * noteDuration
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)

    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + noteDuration)
  })
}

/**
 * Triumphant ascending arpeggio for achievement unlocked
 */
export function playUnlockSound(volume = 0.15) {
  // C5 -> E5 -> G5 -> C6
  playRetroBeep([523.25, 659.25, 783.99, 1046.5], 'square', 0.09, volume)
}

/**
 * Level up fanfare
 */
export function playLevelUpSound(volume = 0.15) {
  // G4 -> C5 -> E5 -> G5 -> C6 -> E6
  playRetroBeep([392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51], 'triangle', 0.08, volume)
}

/**
 * Tiny crisp crunchy crunch for pet eating data
 */
export function playMunchSound(volume = 0.1) {
  playRetroBeep([300, 480, 240], 'sawtooth', 0.05, volume * 0.7)
}

/**
 * Cute high-pitched squeak when petting
 */
export function playPetSqueak(volume = 0.15) {
  playRetroBeep([659.25, 880.0], 'sine', 0.06, volume)
}

/**
 * Descending boop on syntax error
 */
export function playErrorChirp(volume = 0.12) {
  playRetroBeep([440, 370, 311], 'sawtooth', 0.07, volume)
}
