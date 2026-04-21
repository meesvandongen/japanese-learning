/**
 * Minimal common denominator for the two SQLite backends we target:
 *   - @sqlite.org/sqlite-wasm (web, backed by OPFS)
 *   - expo-sqlite (iOS / Android, synchronous native)
 *
 * The interface intentionally uses only primitives supported by both. Both
 * drivers let us execute a SQL string with bound parameters and get back
 * either a single row, a list of rows, or nothing.
 */
export interface DB {
  /** Execute a statement returning no rows (INSERT / UPDATE / DELETE / DDL). */
  run(sql: string, params?: SQLParam[]): Promise<void>
  /** Execute a query returning the first row, or null if there are no rows. */
  first<T = Row>(sql: string, params?: SQLParam[]): Promise<T | null>
  /** Execute a query returning all rows. */
  all<T = Row>(sql: string, params?: SQLParam[]): Promise<T[]>
  /** Run a batch of statements inside a transaction. */
  transaction(fn: (tx: DB) => Promise<void>): Promise<void>
  /** Close the handle. Called on teardown; safe to omit during normal use. */
  close(): Promise<void>
}

export type SQLParam = string | number | null
export type Row = Record<string, SQLParam>

export interface DBOpenOptions {
  /** Manifest version the database should satisfy. */
  manifestVersion?: number
}
