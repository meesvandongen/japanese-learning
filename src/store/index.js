import { useSyncExternalStore } from 'react'

/**
 * Persistence adapters — each must implement { load(): any, save(state): void }
 */
export function localStorageAdapter(key) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch {}
    },
  }
}

export function sessionStorageAdapter(key) {
  return {
    load() {
      try {
        const raw = sessionStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    save(state) {
      try {
        sessionStorage.setItem(key, JSON.stringify(state))
      } catch {}
    },
  }
}

export function memoryAdapter() {
  let stored = null
  return {
    load: () => stored,
    save: (state) => { stored = state },
  }
}

/**
 * createStore(initialState, adapter?)
 *
 * Creates a reactive store backed by the given persistence adapter.
 * Merges persisted data on top of initialState at construction time.
 *
 * Returns: { getState, setState, subscribe, reset }
 */
export function createStore(initialState, adapter = memoryAdapter()) {
  // Deep-merge persisted data on top of defaults so new keys survive upgrades
  const persisted = adapter.load() ?? {}
  let state = deepMerge(initialState, persisted)

  const listeners = new Set()

  function notify() {
    listeners.forEach((fn) => fn(state))
  }

  return {
    getState() {
      return state
    },

    setState(updater) {
      state =
        typeof updater === 'function'
          ? updater(state)
          : { ...state, ...updater }
      adapter.save(state)
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** Wipe persisted state and revert to initialState */
    reset() {
      state = { ...initialState }
      adapter.save(state)
      notify()
    },
  }
}

/**
 * React hook — subscribes to a store slice using useSyncExternalStore.
 * Re-renders only when the selected slice changes (referential equality).
 *
 * @param {ReturnType<createStore>} store
 * @param {(state: any) => any} [selector] — defaults to identity
 */
export function useStore(store, selector = (s) => s) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepMerge(defaults, overrides) {
  if (!overrides || typeof overrides !== 'object') return defaults
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    const def = defaults[key]
    const over = overrides[key]
    if (
      def !== null &&
      typeof def === 'object' &&
      !Array.isArray(def) &&
      over !== null &&
      typeof over === 'object' &&
      !Array.isArray(over)
    ) {
      result[key] = deepMerge(def, over)
    } else {
      result[key] = over
    }
  }
  return result
}
