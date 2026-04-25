import { useCallback, useEffect, useRef } from 'react'
import { Asset } from 'expo-asset'
import { AudioPlayer, createAudioPlayer } from 'expo-audio'

/**
 * Native audio feedback via expo-audio.
 *
 * Plays short pre-generated WAVs bundled with the app. The web version uses
 * WebAudio to synthesize beeps on the fly; native-side we ship the sounds as
 * assets to avoid re-synthesising on every card flip.
 */
export function useAudioFeedback() {
  const correctRef = useRef<AudioPlayer | null>(null)
  const incorrectRef = useRef<AudioPlayer | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [correctAsset, incorrectAsset] = await Promise.all([
        Asset.loadAsync(require('../../assets/correct.wav')),
        Asset.loadAsync(require('../../assets/incorrect.wav')),
      ])
      if (cancelled) return
      correctRef.current = createAudioPlayer(correctAsset[0].localUri ?? correctAsset[0].uri)
      incorrectRef.current = createAudioPlayer(incorrectAsset[0].localUri ?? incorrectAsset[0].uri)
    }
    load().catch(() => { /* ignore — audio feedback is non-essential */ })
    return () => {
      cancelled = true
      correctRef.current?.remove()
      incorrectRef.current?.remove()
      correctRef.current = null
      incorrectRef.current = null
    }
  }, [])

  const playCorrect = useCallback(() => {
    try {
      correctRef.current?.seekTo(0)
      correctRef.current?.play()
    } catch { /* ignore */ }
  }, [])

  const playIncorrect = useCallback(() => {
    try {
      incorrectRef.current?.seekTo(0)
      incorrectRef.current?.play()
    } catch { /* ignore */ }
  }, [])

  return { playCorrect, playIncorrect }
}
