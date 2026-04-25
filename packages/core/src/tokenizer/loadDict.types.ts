/**
 * Shared tokenizer dictionary types.
 *
 * The kuromoji IPA dictionary ships as 12 gzipped .dat files. We load them
 * into ArrayBuffers and hand them to @patdx/kuromoji, which builds the
 * trie/matrix in-memory.
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
