import * as SQLite from 'expo-sqlite'
import { Asset } from 'expo-asset'
import { File, Directory } from 'expo-file-system'
import type { DB, DBOpenOptions, Row, SQLParam } from './types'
import { WRITE_TABLES_SQL } from './schema'

const DB_NAME = 'vocab.db'

// require() is hoisted by Metro at bundle time; the asset metadata is
// resolved here so the file is included in the APK / IPA. The literal
// path resolves to packages/core/assets/vocab.db (populated by
// scripts/generate-vocab-db.mjs at build time).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VOCAB_DB_ASSET = require('../../assets/vocab.db')

let dbHandle: SQLite.SQLiteDatabase | null = null
let openPromise: Promise<SQLite.SQLiteDatabase> | null = null

async function ensureBundledDB(): Promise<void> {
  // expo-sqlite resolves DB_NAME against `defaultDatabaseDirectory`
  // (`${documentDirectory}/SQLite/` on iOS/Android). On first launch the
  // file doesn't exist there yet — we materialise it from the bundled
  // asset, which Metro has stashed somewhere under the app's bundle
  // resources, and copy it into the SQLite directory.
  const sqliteDir = new Directory(SQLite.defaultDatabaseDirectory)
  if (!sqliteDir.exists) sqliteDir.create({ intermediates: true })

  const target = new File(sqliteDir, DB_NAME)
  if (target.exists) return  // Already populated by a prior launch.

  const asset = Asset.fromModule(VOCAB_DB_ASSET)
  await asset.downloadAsync()
  if (!asset.localUri) {
    throw new Error('expo-asset failed to materialise vocab.db')
  }

  const source = new File(asset.localUri)
  source.copy(target)
}

async function openHandle(opts: DBOpenOptions): Promise<SQLite.SQLiteDatabase> {
  if (dbHandle) return dbHandle
  if (openPromise) return openPromise

  openPromise = (async () => {
    await ensureBundledDB()
    const handle = await SQLite.openDatabaseAsync(DB_NAME)

    // Make sure the write tables exist — the shipped asset already has them
    // (the generator emits the full schema), but `IF NOT EXISTS` keeps this
    // a no-op if anyone ever ships a slimmer DB.
    await handle.execAsync(WRITE_TABLES_SQL)

    if (opts.manifestVersion != null) {
      await handle.runAsync(
        'INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['manifest_version', String(opts.manifestVersion)]
      )
    }

    dbHandle = handle
    return handle
  })()

  return openPromise
}

export async function openDatabase(opts: DBOpenOptions = {}): Promise<DB> {
  const handle = await openHandle(opts)

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
    openPromise = null
  }

  return { run, first, all, transaction, close }
}
