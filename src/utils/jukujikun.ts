/**
 * 熟字訓 (jukujikun) — kanji compounds whose standard spoken reading
 * doesn't follow character-by-character on'yomi / kun'yomi rules.
 *
 * Kuromoji's dictionary often returns the on'yomi or a less common reading
 * for these words, while the Web Speech API outputs the kanji form when a
 * user speaks the colloquial reading.  This map bridges the gap by providing
 * the alternative hiragana readings that should also be accepted.
 *
 * Format: kanji → [hiragana reading(s)]
 */
export const JUKUJIKUN: ReadonlyMap<string, readonly string[]> = new Map([
  // Time / calendar
  ['一昨年', ['おととし']],
  ['一昨日', ['おととい', 'おとつい']],
  ['明日', ['あした', 'あす']],
  ['昨日', ['きのう']],
  ['今日', ['きょう']],
  ['今朝', ['けさ']],
  ['一日', ['ついたち']],
  ['二十日', ['はつか']],
  ['二十歳', ['はたち']],
  ['七夕', ['たなばた']],
  ['大晦日', ['おおみそか']],

  // People / roles
  ['大人', ['おとな']],
  ['素人', ['しろうと']],
  ['玄人', ['くろうと']],
  ['仲人', ['なこうど']],

  // Nature / weather
  ['梅雨', ['つゆ']],
  ['紅葉', ['もみじ']],
  ['風邪', ['かぜ']],

  // Objects / items
  ['眼鏡', ['めがね']],
  ['時計', ['とけい']],
  ['浴衣', ['ゆかた']],
  ['足袋', ['たび']],
  ['草履', ['ぞうり']],

  // Food / places / misc
  ['果物', ['くだもの']],
  ['土産', ['みやげ']],
  ['お土産', ['おみやげ']],
  ['田舎', ['いなか']],
  ['八百屋', ['やおや']],
  ['為替', ['かわせ']],
  ['相撲', ['すもう']],

  // Skills
  ['上手', ['じょうず']],
  ['下手', ['へた']],
])
