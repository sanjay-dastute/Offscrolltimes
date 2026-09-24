// Test-only D1Database adapter backed by Node's built-in SQLite, applying the real
// migration so lifecycle store/reconciliation tests exercise actual SQL
// (constraints, upserts, dedupe) instead of a hand-rolled fake. Never
// imported by production code (node:sqlite doesn't exist in Workers).
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../migrations')
const MIGRATION_FILES = [
  '0004_customer_subscriptions.sql',
  '0005_admin_console.sql',
  '0006_contact_enquiries.sql',
  '0007_pricing_entitlements.sql',
  '0008_discount_rules.sql',
  '0009_razorpay_checkout.sql',
  '0010_customer_profile.sql',
  '0011_admin_customer_management.sql',
  '0012_edition_eligibility.sql',
  '0013_transactional_communications.sql',
  '0014_canonical_data_model.sql',
  '0015_security_controls.sql',
  '0016_first_party_analytics.sql',
  '0017_launch_monitoring.sql',
  '0018_social_auth.sql',
  '0019_revocable_sessions.sql',
  '0020_pricing_snapshot_immutability.sql',
  '0021_checkout_idempotency.sql',
  '0022_admin_history_immutability.sql',
  '0023_in_app_account_events.sql',
  '0024_final_data_model.sql',
  '0025_retention_controls.sql',
  '0026_india_launch_pricing.sql',
  '0027_private_object_storage.sql',
]

export function createTestD1(): D1Database {
  const sqliteDb = new DatabaseSync(':memory:')
  for (const file of MIGRATION_FILES) {
    sqliteDb.exec(readFileSync(path.join(migrationsDir, file), 'utf8'))
  }
  return wrapAsD1(sqliteDb)
}

// SQLite bindings accept typed arrays but not DataView, so a
// plain `ArrayBuffer.isView` check narrows too wide; exclude DataView to land
// on NodeJS.TypedArray.
function isTypedArray(value: unknown): value is NodeJS.TypedArray {
  return ArrayBuffer.isView(value) && !(value instanceof DataView)
}

// D1PreparedStatement.bind accepts `unknown` (it's the ambient Workers
// surface); this app only ever binds SQLite-representable primitives, so
// this narrows at runtime rather than casting the boundary away.
function toSqliteBindings(values: unknown[]): SQLInputValue[] {
  return values.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint' ||
      isTypedArray(value)
    ) {
      return value
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0
    }
    throw new TypeError(`Unsupported SQLite binding value of type ${typeof value}`)
  })
}

function wrapAsD1(sqliteDb: DatabaseSync): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      let boundArgs: SQLInputValue[] = []
      const statement = {
        bind(...args: unknown[]) {
          boundArgs = toSqliteBindings(args)
          return statement
        },
        async run<T>() {
          const result = sqliteDb.prepare(query).run(...boundArgs)
          return {
            results: [] as T[],
            success: true,
            meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
          }
        },
        async all<T>() {
          const results = sqliteDb.prepare(query).all(...boundArgs) as T[]
          return { results, success: true, meta: {} }
        },
        async first<T>() {
          const row = sqliteDb.prepare(query).get(...boundArgs)
          return (row as T | undefined) ?? null
        },
      } as unknown as D1PreparedStatement
      return statement
    },
    async batch<T>(statements: D1PreparedStatement[]) {
      const results: D1Result<T>[] = []
      for (const statement of statements) results.push(await statement.run<T>())
      return results
    },
  } as unknown as D1Database
}
