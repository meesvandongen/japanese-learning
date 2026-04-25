import { useEffect } from 'react'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'

const TAG = 'japanese-learning-study'

/**
 * Native keep-awake via expo-keep-awake. Keeps the screen on while a study
 * session is active. Walk mode uses a separate AVAudioSession/foreground-service
 * pathway — this hook only covers the screen-on requirement.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    activateKeepAwakeAsync(TAG).catch(() => { /* ignore */ })
    return () => { deactivateKeepAwake(TAG) }
  }, [enabled])
}
