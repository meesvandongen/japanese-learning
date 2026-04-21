import type { DB, Row } from './types'
import type { Manifest, Language, Level } from '../types'
import { getKV } from './kv'

interface LanguageRow extends Row {
  id: string
  name: string
}

interface LevelRow extends Row {
  language_id: string
  id: string
  label: string
  description: string
  word_count: number
}

/**
 * Re-constructs the old JSON manifest shape from the database. Lets existing
 * UI components keep working against the same types while we migrate the
 * rest of the data layer.
 */
export async function getManifest(db: DB): Promise<Manifest> {
  const versionStr = await getKV(db, 'manifest_version')
  const version = versionStr ? Number(versionStr) : 1

  const langRows = await db.all<LanguageRow>('SELECT id, name FROM languages ORDER BY id')
  const languages: Language[] = []
  for (const lr of langRows) {
    const levelRows = await db.all<LevelRow>(
      `SELECT l.language_id, l.id, l.label, l.description,
              (SELECT COUNT(*) FROM words w WHERE w.language_id = l.language_id AND w.level_id = l.id) AS word_count
       FROM levels l
       WHERE l.language_id = ?
       ORDER BY l.id`,
      [lr.id]
    )
    const levels: Level[] = levelRows.map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      wordCount: r.word_count,
      // `file` is legacy metadata — kept only so consumers that read it don't
      // break. After the JSON-fetch path is removed this field can go.
      file: `${lr.id}/${r.id}.json`,
    }))
    languages.push({ id: lr.id, name: lr.name, levels })
  }

  return { version, languages }
}
