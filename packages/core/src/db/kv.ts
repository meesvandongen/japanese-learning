import type { DB, Row } from './types'

interface KVRow extends Row {
  key: string
  value: string
}

export async function getKV(db: DB, key: string): Promise<string | null> {
  const row = await db.first<KVRow>('SELECT value FROM kv WHERE key = ?', [key])
  return row?.value ?? null
}

export async function putKV(db: DB, key: string, value: string): Promise<void> {
  await db.run(
    `INSERT INTO kv(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
    [key, value]
  )
}
