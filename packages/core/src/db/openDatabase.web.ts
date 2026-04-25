import type { DB, DBOpenOptions, Row, SQLParam } from './types'
import { WRITE_TABLES_SQL } from './schema'

const DB_FILENAME = 'vocab.db'
const DB_URL = '/vocab.db'

type OpfsDatabaseInstance = {
  exec(opts: {
    sql: string
    bind?: SQLParam[]
    returnValue?: string
    rowMode?: string
    resultRows?: unknown[]
  }): unknown
  close(): void
}

type Sqlite3Static = {
  oo1: { OpfsDb: new (filename: string, mode?: string) => OpfsDatabaseInstance }
  capi: {
    sqlite3_js_vfs_list(): string[]
  }
}

let initPromise: Promise<{ sqlite3: Sqlite3Static; db: OpfsDatabaseInstance }> | null = null

async function bootstrap(opts: DBOpenOptions): Promise<{
  sqlite3: Sqlite3Static
  db: OpfsDatabaseInstance
}> {
  // Dynamic import keeps the ~700KB wasm + js out of the main bundle until
  // the first DB operation — handy when the onboarding screens don't need it.
  const mod = await import('@sqlite.org/sqlite-wasm')
  const sqlite3 = (await (mod.default as () => Promise<Sqlite3Static>)()) as Sqlite3Static

  if (!sqlite3.capi.sqlite3_js_vfs_list().includes('opfs')) {
    throw new Error('OPFS VFS not available — serve the app with COOP/COEP cross-origin-isolation headers')
  }

  // Seed OPFS with the shipped vocab.db on first launch. sqlite-wasm doesn't
  // expose direct file-copy helpers from the OO API here, so we use the raw
  // OPFS interface: write the bytes, then open the resulting file via
  // OpfsDb(filename, "ct") (create-if-missing, exists-read).
  const opfsRoot = await navigator.storage.getDirectory()
  let exists = true
  try {
    await opfsRoot.getFileHandle(DB_FILENAME)
  } catch {
    exists = false
  }

  if (!exists) {
    const res = await fetch(DB_URL)
    if (!res.ok) throw new Error(`Failed to fetch ${DB_URL}: ${res.status}`)
    const blob = await res.blob()
    const handle = await opfsRoot.getFileHandle(DB_FILENAME, { create: true })
    const writable = await (handle as FileSystemFileHandle & {
      createWritable: () => Promise<FileSystemWritableFileStream>
    }).createWritable()
    await writable.write(blob)
    await writable.close()
  }

  const db = new sqlite3.oo1.OpfsDb(`/${DB_FILENAME}`, 'ct')

  for (const stmt of WRITE_TABLES_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
    db.exec({ sql: stmt })
  }

  if (opts.manifestVersion != null) {
    db.exec({
      sql: 'INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      bind: ['manifest_version', String(opts.manifestVersion)],
    })
  }

  return { sqlite3, db }
}

export async function openDatabase(opts: DBOpenOptions = {}): Promise<DB> {
  if (!initPromise) initPromise = bootstrap(opts)
  const { db } = await initPromise

  function rowsFromExec(sql: string, params?: SQLParam[]): Row[] {
    const rows: Row[] = []
    db.exec({
      sql,
      bind: params,
      rowMode: 'object',
      returnValue: 'resultRows',
      resultRows: rows,
    })
    return rows
  }

  async function run(sql: string, params?: SQLParam[]): Promise<void> {
    db.exec({ sql, bind: params })
  }

  async function all<T = Row>(sql: string, params?: SQLParam[]): Promise<T[]> {
    return rowsFromExec(sql, params) as T[]
  }

  async function first<T = Row>(sql: string, params?: SQLParam[]): Promise<T | null> {
    const rows = rowsFromExec(sql, params)
    return (rows[0] as T | undefined) ?? null
  }

  async function transaction(fn: (tx: DB) => Promise<void>): Promise<void> {
    db.exec({ sql: 'BEGIN' })
    try {
      await fn({ run, first, all, transaction, close })
      db.exec({ sql: 'COMMIT' })
    } catch (e) {
      db.exec({ sql: 'ROLLBACK' })
      throw e
    }
  }

  async function close(): Promise<void> {
    db.close()
    initPromise = null
  }

  return { run, first, all, transaction, close }
}
