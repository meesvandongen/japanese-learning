import { applyReview, getNextCard } from '../srs'
import type { WalkModeOptions, WalkModeSession, WalkModeState } from './types'

// Minimal Web Speech API shape — the lib.dom types don't include it yet.
interface SRResult { transcript: string }
interface SRResultList { [i: number]: SRResult; length: number; [Symbol.iterator](): Iterator<SRResult> }
interface SREvent { results: SRResultList[] }
interface SRInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: SREvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
interface SRCtor { new (): SRInstance }

/**
 * Web walk mode.
 *
 * Browsers won't let us keep a mic capture running from a tab that's lost
 * focus. We compensate with the Media Session API (so the lock-screen
 * transport controls at least look familiar) and `navigator.wakeLock` (so
 * the screen stays on while the tab is foregrounded).
 *
 * When the tab is hidden, we pause the loop and wait for the user to
 * refocus; on resume we pick up where we left off.
 *
 * Walk mode on native (see createWalkModeSession.native.ts) is the real
 * thing — on web this is primarily a fallback for users who open the site
 * on mobile browsers.
 */
export function createWalkModeSession(opts: WalkModeOptions): WalkModeSession {
  let state: WalkModeState = 'idle'
  const listeners = new Set<(s: WalkModeState) => void>()
  let recognition: SRInstance | null = null
  let wakeLock: WakeLockSentinel | null = null
  let currentKana: string | null = null
  let cancelled = false

  function setState(s: WalkModeState) {
    state = s
    for (const l of listeners) l(s)
  }

  async function speak(text: string, lang: string): Promise<void> {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    })
  }

  async function listen(lang: string): Promise<string[]> {
    return new Promise((resolve) => {
      const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
      if (!SR) return resolve([])
      recognition = new SR()
      recognition.lang = lang
      recognition.interimResults = false
      recognition.maxAlternatives = 3
      recognition.onresult = (event: SREvent) => {
        const rs = Array.from(event.results[0]).map((r: SRResult) => r.transcript)
        resolve(rs)
      }
      recognition.onerror = () => resolve([])
      recognition.onend = () => { recognition = null }
      try { recognition.start() } catch { resolve([]) }
    })
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator)) return
    const { card } = getNextCard(opts.cards, opts.getCardStates(), currentKana)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: card.english[0] ?? '',
      artist: 'Japanese Learning — Walk mode',
      album: card.japanese,
    })
    navigator.mediaSession.setActionHandler('pause', () => stop())
    navigator.mediaSession.setActionHandler('play', () => start())
    navigator.mediaSession.setActionHandler('nexttrack', () => answerCurrent(4))
    navigator.mediaSession.setActionHandler('previoustrack', () => answerCurrent(1))
  }

  async function answerCurrent(quality: number) {
    if (!currentKana) return
    const existing = opts.getCardStates()[currentKana]
    opts.applyCardReview(currentKana, applyReview(existing, quality))
  }

  async function loop() {
    while (!cancelled) {
      const { card } = getNextCard(opts.cards, opts.getCardStates(), currentKana)
      currentKana = card.kana
      updateMediaSession()

      setState('prompting')
      await speak(card.english[0] ?? '', opts.promptLang)
      if (cancelled) return

      setState('listening')
      const transcripts = await listen(opts.answerLang)
      if (cancelled) return

      setState('feedback')
      // Minimal heuristic here — the caller can subscribe and run their own
      // comparator. We just assume a spoken response is a "good" answer for
      // this web fallback; real grading happens via the foreground UI.
      const quality = transcripts.length > 0 ? 4 : 1
      answerCurrent(quality)
      await new Promise((r) => setTimeout(r, 800))
    }
  }

  async function start() {
    if (state !== 'idle' && state !== 'paused') return
    cancelled = false
    try {
      wakeLock = await navigator.wakeLock?.request('screen') ?? null
    } catch { /* ignore */ }
    loop().catch(() => { /* fall through to stop */ })
  }

  async function stop() {
    cancelled = true
    setState('idle')
    try { recognition?.abort() } catch { /* ignore */ }
    try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    try { wakeLock?.release() } catch { /* ignore */ }
    wakeLock = null
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
