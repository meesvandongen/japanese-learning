import { useEffect, useRef } from 'react'

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let released = false

    async function acquire() {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch {
        // Wake Lock request failed (e.g. low battery, tab hidden)
      }
    }

    // Re-acquire when the page becomes visible again (wake locks are
    // automatically released when the document becomes hidden).
    function onVisibilityChange() {
      if (!released && document.visibilityState === 'visible') {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [enabled])
}
