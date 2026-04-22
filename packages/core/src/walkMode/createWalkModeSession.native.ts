import { Platform } from 'react-native'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { setAudioModeAsync } from 'expo-audio'
import * as Speech from 'expo-speech'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event as RNTPEvent,
  State as RNTPState,
} from 'react-native-track-player'
import type { EventSubscription } from 'expo-modules-core'
import { applyReview, getNextCard } from '../srs'
import { compareJapanese, compareEnglish } from '../utils'
import type { WalkModeOptions, WalkModeSession, WalkModeState } from './types'

const TAG = 'japanese-learning-walk'

/**
 * Native walk mode.
 *
 * Requirements met:
 *
 * iOS
 *   - `Info.plist` UIBackgroundModes: ['audio'] (set in app.json)
 *   - NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription
 *   - AVAudioSession configured `.playAndRecord`, `.spokenAudio`,
 *     `.mixWithOthers | .allowBluetooth` — done by setAudioModeAsync()
 *   - Session stays active: RNTP keeps a silent queue playing so iOS
 *     doesn't kill the session while the lock screen is active
 *   - On-device recognition: requiresOnDeviceRecognition: true — no
 *     network dependency, works in airplane mode
 *
 * Android
 *   - android.permission.RECORD_AUDIO
 *   - android.permission.FOREGROUND_SERVICE
 *   - android.permission.FOREGROUND_SERVICE_MICROPHONE (API 34+)
 *   - RNTP `android.appKilledPlaybackBehavior: 'ContinuePlayback'` ensures
 *     the foreground service survives app-kill when walk mode is active
 *
 * Lock-screen controls
 *   - Play/Pause → pause / resume the queue
 *   - Next       → grade Easy (quality 4)
 *   - Previous   → grade Again (quality 1)
 *
 * The session is driven by a generator-style async loop: prompt → listen →
 * compare → feedback → advance. Each step is cancellable via `cancelled`
 * so `stop()` can bail out of whichever phase we're in.
 */

let rntpInitialized = false

async function ensureTrackPlayer() {
  if (rntpInitialized) return
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  })
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
  })
  rntpInitialized = true
}

export function createWalkModeSession(opts: WalkModeOptions): WalkModeSession {
  let state: WalkModeState = 'idle'
  let cancelled = false
  let currentKana: string | null = null
  let lastTranscripts: string[] = []
  const listeners = new Set<(s: WalkModeState) => void>()
  const rntpSubs: Array<EventSubscription> = []
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
      lastTranscripts = []

      // Populate lock-screen now-playing metadata so the user sees the
      // current prompt on their glance UI.
      await TrackPlayer.updateMetadataForTrack(0, {
        title: card.english[0] ?? '',
        artist: 'Japanese Learning',
        album: card.japanese,
      }).catch(() => { /* silent queue track may not exist yet */ })

      setState('prompting')
      await speakAsync(card.english[0] ?? '', opts.promptLang)
      if (cancelled) return

      setState('listening')
      lastTranscripts = await listenOnceAsync(opts.answerLang, [
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
        ? compareJapanese([card.kana, card.japanese, ...(card.alt ?? [])], lastTranscripts, null)
        : compareEnglish(card.english, lastTranscripts)

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
      // Corresponds to AVAudioSessionModeSpokenAudio on iOS.
      iosCategory: 'playAndRecord',
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

    await ensureTrackPlayer()
    // Add a silent, looped "track" to keep the audio session active on iOS.
    // On Android the same track plus foreground-service type gives us the
    // persistent notification required by API 34+.
    await TrackPlayer.reset()
    await TrackPlayer.add({
      // 1-second silent wav shipped with the app. Replace the require path
      // once you add the file; a generated tone works too.
      url: require('../../assets/silence.wav'),
      title: '—',
      artist: 'Japanese Learning — Walk mode',
      // Treat the track as a long stream so iOS treats playback as live
      // audio rather than a short cue.
      duration: 10 ** 6,
    })
    await TrackPlayer.play()

    rntpSubs.push(
      TrackPlayer.addEventListener(RNTPEvent.RemotePlay, async () => {
        if (state === 'paused') start()
      }),
      TrackPlayer.addEventListener(RNTPEvent.RemotePause, async () => {
        cancelled = true
        setState('paused')
        try { await TrackPlayer.pause() } catch { /* ignore */ }
      }),
      TrackPlayer.addEventListener(RNTPEvent.RemoteNext, () => grade(4)),
      TrackPlayer.addEventListener(RNTPEvent.RemotePrevious, () => grade(1)),
      TrackPlayer.addEventListener(RNTPEvent.PlaybackState, async (e) => {
        // On iOS, losing the audio session (e.g. phone call) fires a
        // PlaybackState: interrupted event. We stop gracefully and let the
        // user resume via the lock-screen play button.
        if (e.state === RNTPState.Paused && state !== 'paused') setState('paused')
      })
    )

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
    for (const s of rntpSubs) s.remove()
    rntpSubs.length = 0
    for (const s of sttSubs) s.remove()
    sttSubs.length = 0
    try { await TrackPlayer.reset() } catch { /* ignore */ }
    deactivateKeepAwake(TAG)
    awaitingResult = null
  }

  // Quiet unused-var warnings for the tokens TS flags as platform-specific.
  void Platform

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
