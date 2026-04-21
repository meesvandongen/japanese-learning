import type { StateStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'

/**
 * Native storage adapter — backed by react-native-mmkv for synchronous,
 * high-performance KV access. MMKV is the native counterpart to localStorage.
 *
 * v4 of react-native-mmkv exposes `createMMKV(config)` rather than `new MMKV()`.
 */
const mmkv = createMMKV({ id: 'japanese-learning' })

export const storage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => { mmkv.set(name, value) },
  removeItem: (name) => { mmkv.remove(name) },
}
