import { useCallback, useRef } from 'react'

export function useAudioFeedback() {
  const audioCtxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }

  const playCorrect = useCallback(() => {
    try {
      const ctx = getCtx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)
    } catch {
      // AudioContext not available (e.g., in tests)
    }
  }, [])

  const playIncorrect = useCallback(() => {
    try {
      const ctx = getCtx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(220, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch {
      // AudioContext not available (e.g., in tests)
    }
  }, [])

  return { playCorrect, playIncorrect }
}
