/**
 * Walk-mode session lifecycle types, shared between web and native.
 *
 * Walk mode is the "eyes-off, phone-in-pocket" study mode. The user hears
 * a TTS prompt, speaks their answer, hears audio feedback, advances. It
 * must keep running when:
 *
 *   - the screen is off (iOS lock screen, Android doze)
 *   - the app is backgrounded (user switches to another app)
 *   - headphones toggle play/pause / next / prev via media-session buttons
 *
 * The interface is platform-agnostic. Web uses Web Speech + speechSynthesis
 * and the Media Session API; native uses expo-speech-recognition with
 * on-device recognition + react-native-track-player for lock-screen
 * controls + expo-task-manager for the Android foreground service.
 */

export type WalkModeState = 'idle' | 'prompting' | 'listening' | 'feedback' | 'paused'

export interface WalkModeSession {
  /** Start the session. Must be called from a user-initiated tap — iOS won't
   *  activate a mic session from a background-triggered start. */
  start(): Promise<void>

  /** Gracefully stop. Releases the audio session, deactivates keep-awake,
   *  stops the foreground service. */
  stop(): Promise<void>

  /** Observable state transitions for UI surfaces. */
  subscribe(listener: (state: WalkModeState) => void): () => void

  /** Current state snapshot. */
  getState(): WalkModeState
}

export interface WalkModeOptions {
  /** Locale for the TTS prompt. */
  promptLang: string
  /** Locale for the STT answer. */
  answerLang: string
  /** Seed card list; walk mode pulls the next card from here via its
   *  internal scheduler (driven by `getNextCard` from `@japanese-learning/core`). */
  cards: import('../types').Word[]
  /** Current card state — must be mutable across the session so the
   *  scheduler sees updated SRS values after each answer. */
  getCardStates(): Record<string, import('../types').CardState>
  /** Persist a reviewed card. Walk mode calls this on every answer. */
  applyCardReview(kana: string, updated: import('../types').CardState): void
}
