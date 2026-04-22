/**
 * Platform router for WalkMode. Metro picks `.native.ts` on iOS/Android;
 * web falls back to the stub below via extension resolution.
 */
export { createWalkModeSession } from './createWalkModeSession.web'
export { useWalkMode } from './useWalkMode'
export type { WalkModeSession, WalkModeState, WalkModeOptions } from './types'
