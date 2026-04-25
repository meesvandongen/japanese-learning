import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { setAudioModeAsync } from 'expo-audio'
import * as Speech from 'expo-speech'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import type { EventSubscription } from 'expo-modules-core'
import { applyReview, getNextCard } from '../srs'
import { compareJapanese, compareEnglish } from '../utils'
import type { WalkModeOptions, WalkModeSession, WalkModeState } from './types'

const TAG = 'japanese-learning-walk'

/**
 * Native walk mode.
 *
 * Foreground-only for now — keep-awake stays active and AVAudioSession is
 * configured for `.playAndRecord` so the mic can run alongside TTS, but
 * we don't currently keep a silent track playing to extend the session
 * past lock-screen. That requires either react-native-track-player
 * (currently incompatible with RN 0.83 + Kotlin null-safety) or a custom
 * AVAudioSession activation native module — both out of scope for the
 * initial migration.
 *
 * Requirements satisfied today:
 * - iOS NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription
 * - iOS AVAudioSession `.playAndRecord` + spoken-audio mode (setAudioModeAsync)
 * - Android RECORD_AUDIO + FOREGROUND_SERVICE_MICROPHONE permissions in app.json
 * - On-device speech recognition (requiresOnDeviceRecognition: true) so it
 *   works in airplane mode and doesn't drain the user's data plan
 *
 * Out of scope (follow-up native work):
 * - Persistent lock-screen / control-centre transport controls
 * - Surviving app-swipe on Android (foreground-service notification)
 * - iOS background recording past the lock screen
 *
 * The session is driven by a generator-style async loop: prompt → listen →
 * compare → feedback → advance. Each step is cancellable via `cancelled`
 * so `stop()` can bail out of whichever phase we're in.
 */

export function createWalkModeSession(opts: WalkModeOptions): WalkModeSession {
  let state: WalkModeState = 'idle'
  let cancelled = false
  let currentKana: string | null = null
  const listeners = new Set<(s: WalkModeState) => void>()
  const sttSubs: Array<EventSubscription> = []
  let awaitingResult: ((transcripts: string[]) => void) | null = null

  function setState(s: WalkModeState) {
    state = s
    for (const l of listeners) l(s)
  }

  async function speakAsync(text: string, lang: string): Promise<void> {
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: lang,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      })
    })
  }

  async function listenOnceAsync(lang: string, contextualStrings: string[]): Promise<string[]> {
    return new Promise((resolve) => {
      awaitingResult = resolve
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: false,
        maxAlternatives: 3,
        continuous: false,
        requiresOnDeviceRecognition: true,
        addsPunctuation: false,
        contextualStrings,
      })
    })
  }

  async function grade(quality: number) {
    if (!currentKana) return
    const existing = opts.getCardStates()[currentKana]
    opts.applyCardReview(currentKana, applyReview(existing, quality))
  }

  async function loop() {
    while (!cancelled) {
      const { card } = getNextCard(opts.cards, opts.getCardStates(), currentKana)
      currentKana = card.kana

      setState('prompting')
      await speakAsync(card.english[0] ?? '', opts.promptLang)
      if (cancelled) return

      setState('listening')
      const transcripts = await listenOnceAsync(opts.answerLang, [
        card.kana,
        card.japanese,
        ...(card.alt ?? []),
        ...card.english,
      ])
      if (cancelled) return

      // Grade locally. Japanese side uses compareJapanese with no tokenizer
      // (walk mode runs without kuromoji to keep startup fast; we rely on
      // kana-level matching). English side uses compareEnglish with default
      // phonetics.
      const correct = opts.answerLang.startsWith('ja')
        ? compareJapanese([card.kana, card.japanese, ...(card.alt ?? [])], transcripts, null)
        : compareEnglish(card.english, transcripts)

      setState('feedback')
      await speakAsync(card.japanese, opts.promptLang)  // correct answer read-back
      await grade(correct ? 4 : 1)

      // Small gap before the next prompt so listeners have a moment to
      // react to the feedback.
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  async function configureAudioSession() {
    // iOS: playAndRecord + spokenAudio keeps the mic alive under the lock
    // screen, ducks music, and routes through Bluetooth headsets.
    // Android: sets up media-focus behaviour that plays well with other apps.
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: true,
      allowsRecording: true,
    } as Parameters<typeof setAudioModeAsync>[0])
  }

  async function start() {
    if (state !== 'idle' && state !== 'paused') return
    cancelled = false
    await activateKeepAwakeAsync(TAG)
    await configureAudioSession()

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) {
      await stop()
      return
    }

    sttSubs.push(
      ExpoSpeechRecognitionModule.addListener('result', (event) => {
        if (!event.isFinal || !awaitingResult) return
        const transcripts = event.results.map((r: { transcript: string }) => r.transcript)
        const cb = awaitingResult
        awaitingResult = null
        cb(transcripts)
      }),
      ExpoSpeechRecognitionModule.addListener('error', () => {
        if (!awaitingResult) return
        const cb = awaitingResult
        awaitingResult = null
        cb([])
      })
    )

    loop().catch(() => { /* fall through to stop */ })
  }

  async function stop() {
    cancelled = true
    setState('idle')
    try { ExpoSpeechRecognitionModule.stop() } catch { /* ignore */ }
    try { Speech.stop() } catch { /* ignore */ }
    for (const s of sttSubs) s.remove()
    sttSubs.length = 0
    deactivateKeepAwake(TAG)
    awaitingResult = null
  }

  return {
    start,
    stop,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    getState: () => state,
  }
}
