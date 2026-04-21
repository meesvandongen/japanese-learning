import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import type {
  UseSpeechRecognitionOptions,
  UseSpeechRecognitionResult,
} from './useSpeechRecognition.types'

/**
 * Native speech recognition via expo-speech-recognition.
 *
 * - Uses on-device recognition when available (iOS 13+, Android 13+) so it
 *   keeps working in walk-mode without a network connection.
 * - Feeds contextualStrings (expected kana / alt readings) into the
 *   recognizer so single-word flashcard prompts get biased toward the
 *   right vocabulary entry.
 * - Leaves continuous:true off by default — the hook restarts recognition
 *   per prompt, matching the web behaviour. Walk mode flips this on via
 *   a dedicated session wrapper.
 */
export function useSpeechRecognition({
  lang,
  onResult,
  onError,
  contextualStrings,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false)

  // Keep latest callbacks in refs so the listeners always call the latest version
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  useSpeechRecognitionEvent('start', () => setIsListening(true))
  useSpeechRecognitionEvent('end', () => setIsListening(false))
  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return
    const transcripts = event.results.map((r) => r.transcript)
    onResultRef.current(transcripts)
  })
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false)
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      onErrorRef.current(`Speech recognition error: ${event.error}`)
    }
  })

  const start = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!perm.granted) {
        onErrorRef.current('Microphone / speech recognition permission denied')
        return
      }
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: false,
        maxAlternatives: 3,
        continuous: false,
        requiresOnDeviceRecognition: true,
        addsPunctuation: false,
        contextualStrings,
      })
    } catch (e) {
      setIsListening(false)
      onErrorRef.current(`Could not start speech recognition: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [lang, contextualStrings])

  const stop = useCallback(() => {
    try { ExpoSpeechRecognitionModule.stop() } catch { /* ignore */ }
    setIsListening(false)
  }, [])

  return { isListening, start, stop }
}
