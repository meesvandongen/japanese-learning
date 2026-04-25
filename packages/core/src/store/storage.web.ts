import type { StateStorage } from 'zustand/middleware'

/**
 * Web storage adapter — wraps window.localStorage in a StateStorage interface.
 *
 * Falls back to an in-memory Map when localStorage is unavailable (SSR, private
 * browsing, tests) so persist middleware still returns sensible values.
 */
function memoryStorage(): StateStorage {
  const map = new Map<string, string>()
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => { map.set(name, value) },
    removeItem: (name) => { map.delete(name) },
  }
}

export const storage: StateStorage = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItem: (name) => window.localStorage.getItem(name),
        setItem: (name, value) => window.localStorage.setItem(name, value),
        removeItem: (name) => window.localStorage.removeItem(name),
      }
    }
  } catch { /* ignore */ }
  return memoryStorage()
})()
