/**
 * Platform router for loadDictFiles.
 *
 * Metro resolves `.native.ts` when bundling for iOS/Android. Vite is
 * configured to resolve `.web.ts` first.
 */
export { loadDictFiles, type DictFileMap } from './loadDict.web'
