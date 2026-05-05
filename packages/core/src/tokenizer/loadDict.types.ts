/**
 * Shared tokenizer dictionary types.
 *
 * Kuromoji's `loadDictionary` requests files by name (`base.dat.gz`,
 * `cc.dat.gz`, ...) via the loader callback and expects the *gzipped*
 * bytes back. `buildTokenizer` decompresses them with pako before
 * handing the buffers to kuromoji.
 *
 * The platform loaders (`loadDict.{web,native}.ts`) produce the same
 * `DictFileMap` shape — bytes-as-ArrayBuffer keyed by kuromoji name.
 *
 *   - web: fetches `/dict/<name>` from Metro's static export
 *   - native: decodes base64-encoded gzip bytes inlined in the JS bundle
 *     (see scripts/copy-dict.mjs and ./dict-data/)
 */

export type DictFileMap = Map<string, ArrayBuffer>

export const KUROMOJI_DICT_FILES = [
  'base.dat.gz',
  'cc.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_map.dat.gz',
  'tid_pos.dat.gz',
  'unk.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz',
  'unk_map.dat.gz',
  'unk_pos.dat.gz',
] as const
