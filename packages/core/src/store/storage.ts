/**
 * Platform-agnostic storage adapter for Zustand persist middleware.
 *
 * Re-exports the right implementation based on the file extension resolved
 * by the bundler (Metro for native, Vite for web).
 */
export { storage } from './storage.web'
