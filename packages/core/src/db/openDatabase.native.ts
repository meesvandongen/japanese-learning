import * as SQLite from 'expo-sqlite'
import type { DB, DBOpenOptions, Row, SQLParam } from './types'
import { WRITE_TABLES_SQL } from './schema'

const DB_NAME = 'vocab.db'

let dbHandle: SQLite.SQLiteDatabase | null = null

async function getHandle(opts: DBOpenOptions): Promise<SQLite.SQLiteDatabase> {
  if (dbHandle) return dbHandle
  // The vocab DB is shipped as a bundled asset — expo-sqlite copies it
  // into the app's data dir on first launch. The second arg opts into
  // "use existing database" so it isn't clobbered on subsequent launches.
  dbHandle = await SQLite.openDatabaseAsync(DB_NAME, {
    useNewConnection: false,
  })

  // Make sure the write tables exist — the shipped asset contains only
  // read-only vocab; session state tables are created on first launch.
  await dbHandle.execAsync(WRITE_TABLES_SQL)

  if (opts.manifestVersion != null) {
    await dbHandle.runAsync(
      'INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      ['manifest_version', String(opts.manifestVersion)]
    )
  }

  return dbHandle
}

export async function openDatabase(opts: DBOpenOptions = {}): Promise<DB> {
  const handle = await getHandle(opts)

  async function run(sql: string, params: SQLParam[] = []): Promise<void> {
    await handle.runAsync(sql, params)
  }

  async function first<T = Row>(sql: string, params: SQLParam[] = []): Promise<T | null> {
    const row = await handle.getFirstAsync(sql, params)
    return (row as T | null) ?? null
  }

  async function all<T = Row>(sql: string, params: SQLParam[] = []): Promise<T[]> {
    const rows = await handle.getAllAsync(sql, params)
    return rows as T[]
  }

  async function transaction(fn: (tx: DB) => Promise<void>): Promise<void> {
    await handle.withTransactionAsync(async () => {
      await fn({ run, first, all, transaction, close })
    })
  }

  async function close(): Promise<void> {
    await handle.closeAsync()
    dbHandle = null
  }

  return { run, first, all, transaction, close }
}
