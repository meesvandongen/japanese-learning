/**
 * Platform router for useKuromoji.
 *
 * Metro resolves `.native.ts` automatically when bundling for iOS/Android.
 * Vite is configured (apps/web/vite.config.ts) to resolve `.web.ts` first,
 * which makes this file act as the stable import path while still allowing
 * the platform-specific file to win.
 */
export { useKuromoji } from './useKuromoji.web'
