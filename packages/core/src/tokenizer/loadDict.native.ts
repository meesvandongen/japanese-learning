import { File } from 'expo-file-system'
import { Asset } from 'expo-asset'
import { KUROMOJI_DICT_FILES, type DictFileMap } from './loadDict.types'

export type { DictFileMap } from './loadDict.types'

// Registered at module scope so Metro bundles the files as assets.
// Each require() picks up the matching file under packages/core/assets/dict/.
// Metro doesn't support dynamic require() with template strings so we list
// them explicitly.
const DICT_ASSETS: Record<string, number> = {
  'base.dat.gz': require('../../assets/dict/base.dat.gz'),
  'cc.dat.gz': require('../../assets/dict/cc.dat.gz'),
  'check.dat.gz': require('../../assets/dict/check.dat.gz'),
  'tid.dat.gz': require('../../assets/dict/tid.dat.gz'),
  'tid_map.dat.gz': require('../../assets/dict/tid_map.dat.gz'),
  'tid_pos.dat.gz': require('../../assets/dict/tid_pos.dat.gz'),
  'unk.dat.gz': require('../../assets/dict/unk.dat.gz'),
  'unk_char.dat.gz': require('../../assets/dict/unk_char.dat.gz'),
  'unk_compat.dat.gz': require('../../assets/dict/unk_compat.dat.gz'),
  'unk_invoke.dat.gz': require('../../assets/dict/unk_invoke.dat.gz'),
  'unk_map.dat.gz': require('../../assets/dict/unk_map.dat.gz'),
  'unk_pos.dat.gz': require('../../assets/dict/unk_pos.dat.gz'),
}

/**
 * Reads the 12 kuromoji dict files from the bundled assets dir using
 * expo-asset + expo-file-system (class-based API introduced in SDK 55),
 * returning them as ArrayBuffers.
 *
 * First launch: Asset.downloadAsync materialises the file from the bundle
 * into the app's cache dir. Subsequent launches hit the cache — no work.
 */
export async function loadDictFiles(): Promise<DictFileMap> {
  const map: DictFileMap = new Map()
  await Promise.all(
    KUROMOJI_DICT_FILES.map(async (name) => {
      const asset = Asset.fromModule(DICT_ASSETS[name])
      await asset.downloadAsync()
      const uri = asset.localUri ?? asset.uri
      const file = new File(uri)
      const bytes = await file.bytes()
      // Copy into a fresh ArrayBuffer — the one returned by the bytes() API
      // is backed by native memory that may not outlive the call site.
      const buf = new Uint8Array(bytes.byteLength)
      buf.set(bytes)
      map.set(name, buf.buffer)
    })
  )
  return map
}
