import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createWalkModeSession } from './index'
import { useAppStore } from '../store'
import type { WalkModeOptions, WalkModeSession, WalkModeState } from './types'

type Params = Omit<WalkModeOptions, 'getCardStates' | 'applyCardReview'>

/**
 * React hook that wraps a walk-mode session with UI state. Returns:
 *
 *   state   — current lifecycle state ('idle' | 'prompting' | …)
 *   start   — begin the session. MUST be called from a user-initiated
 *             event handler (iOS won't allow a background-triggered mic).
 *   stop    — stop gracefully. Called on unmount too.
 *
 * Card state reads go directly through useAppStore so the session sees
 * the latest values after every review.
 */
export function useWalkMode(params: Params): {
  state: WalkModeState
  start: () => Promise<void>
  stop: () => Promise<void>
} {
  const [state, setState] = useState<WalkModeState>('idle')
  const sessionRef = useRef<WalkModeSession | null>(null)

  const applyCardReview = useAppStore((s) => s.applyCardReview)

  // Re-creating the session on every cards[]/lang change would tear down
  // the audio session; we deliberately capture only the initial prompt+
  // answer lang. The scheduler still sees live card state via getCardStates().
  const session = useMemo(() => {
    const s = createWalkModeSession({
      ...params,
      getCardStates: () => useAppStore.getState().cards,
      applyCardReview,
    })
    sessionRef.current = s
    return s
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [params.promptLang, params.answerLang])

  useEffect(() => session.subscribe(setState), [session])
  useEffect(() => () => { session.stop() }, [session])

  const start = useCallback(() => session.start(), [session])
  const stop = useCallback(() => session.stop(), [session])

  return { state, start, stop }
}
