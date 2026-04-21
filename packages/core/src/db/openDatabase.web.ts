import type { DB, DBOpenOptions, Row, SQLParam } from './types'
import { WRITE_TABLES_SQL } from './schema'

const DB_FILENAME = 'vocab.db'
const DB_URL = '/vocab.db'

type PromiserConfig = { print?: (msg: string) => void; printErr?: (msg: string) => void }
type Promiser = (command: string, payload?: Record<string, unknown>) => Promise<{ result: { resultRows?: unknown[][]; columnNames?: string[]; dbId?: string } }>

let promiserPromise: Promise<{ promiser: Promiser; dbId: string }> | null = null

async function initSqlite(opts: DBOpenOptions): Promise<{ promiser: Promiser; dbId: string }> {
  // sqlite-wasm ships both a worker and its helper; we use the worker
  // promiser so the wasm runs off the main thread.
  const mod = await import('@sqlite.org/sqlite-wasm')
  const promiser: Promiser = await new Promise((resolve) => {
    const p = mod.default({
      onready: () => resolve(p),
    } as unknown as PromiserConfig) as unknown as Promiser
  })

  // Open OPFS-backed DB. If the file does not exist yet, fetch it from
  // /vocab.db (shipped by the build) and stream it into OPFS.
  const opfsRoot = await navigator.storage.getDirectory()
  let exists = true
  try { await opfsRoot.getFileHandle(DB_FILENAME) } catch { exists = false }

  if (!exists) {
    const res = await fetch(DB_URL)
    if (!res.ok) throw new Error(`Failed to fetch ${DB_URL}: ${res.status}`)
    const blob = await res.blob()
    const fileHandle = await opfsRoot.getFileHandle(DB_FILENAME, { create: true })
    const writable = await (fileHandle as FileSystemFileHandle & { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable()
    await writable.write(blob)
    await writable.close()
  }

  const openRes = await promiser('open', { filename: `file:${DB_FILENAME}?vfs=opfs` })
  const dbId = openRes.result.dbId!

  // Ensure write tables exist (they're not in the shipped bundle if the
  // generator was run in read-only mode).
  for (const stmt of WRITE_TABLES_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
    await promiser('exec', { dbId, sql: stmt })
  }

  // Record the manifest version if provided; used elsewhere to detect
  // when the shipped DB needs to be re-downloaded.
  if (opts.manifestVersion != null) {
    await promiser('exec', {
      dbId,
      sql: 'INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      bind: ['manifest_version', String(opts.manifestVersion)],
    })
  }

  return { promiser, dbId }
}

async function getPromiser(opts: DBOpenOptions): Promise<{ promiser: Promiser; dbId: string }> {
  if (!promiserPromise) promiserPromise = initSqlite(opts)
  return promiserPromise
}

function rowsFromResult(res: { resultRows?: unknown[][]; columnNames?: string[] }): Row[] {
  const rows = res.resultRows ?? []
  const cols = res.columnNames ?? []
  return rows.map((r) => {
    const obj: Row = {}
    for (let i = 0; i < cols.length; i++) obj[cols[i]] = r[i] as SQLParam
    return obj
  })
}

export async function openDatabase(opts: DBOpenOptions = {}): Promise<DB> {
  const { promiser, dbId } = await getPromiser(opts)

  async function run(sql: string, params?: SQLParam[]): Promise<void> {
    await promiser('exec', { dbId, sql, bind: params })
  }

  async function all<T = Row>(sql: string, params?: SQLParam[]): Promise<T[]> {
    const { result } = await promiser('exec', {
      dbId,
      sql,
      bind: params,
      rowMode: 'array',
      returnValue: 'resultRows',
      columnNames: [],
    })
    return rowsFromResult(result) as T[]
  }

  async function first<T = Row>(sql: string, params?: SQLParam[]): Promise<T | null> {
    const rows = await all<T>(sql, params)
    return rows[0] ?? null
  }

  async function transaction(fn: (tx: DB) => Promise<void>): Promise<void> {
    await run('BEGIN')
    try {
      await fn({ run, first, all, transaction, close })
      await run('COMMIT')
    } catch (e) {
      await run('ROLLBACK')
      throw e
    }
  }

  async function close(): Promise<void> {
    await promiser('close', { dbId })
    promiserPromise = null
  }

  return { run, first, all, transaction, close }
}
