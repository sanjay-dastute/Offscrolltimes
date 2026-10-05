export type LifecycleBindings = {
  db: D1Database
  lifecycleSecret: string
  files?: R2Bucket
}

export type LifecycleEnv = {
  LIFECYCLE_DB?: D1Database
  LIFECYCLE_SECRET?: string
  OFFSCROLL_FILES?: R2Bucket
}

function resolveLifecycleBindings(env: LifecycleEnv): LifecycleBindings {
  const db = env.LIFECYCLE_DB
  const lifecycleSecret = env.LIFECYCLE_SECRET
  if (!db || !lifecycleSecret || lifecycleSecret.length < 32) {
    throw new Error('Application persistence is unavailable.')
  }
  return { db, lifecycleSecret, files: env.OFFSCROLL_FILES }
}

// Set by the Worker's `fetch` handler from its explicit `env` before TanStack's
// server entry runs, since Cloudflare doesn't place bindings like D1 into
// process.env the way it does with plain vars/secrets under nodejs_compat.
let requestBindings: LifecycleBindings | undefined

// Cloudflare's nodejs_compat runtime populates process.env with plain vars
// and secrets, the same path SESSION_SECRET already relies on elsewhere in
// this app, but not with bindings like D1. Request handling under the
// framework prefers the explicit bindings set by initRequestLifecycleBindings
// and falls back to process.env for local/test environments.
export function lifecycleBindings(): LifecycleBindings {
  if (requestBindings) return requestBindings
  return resolveLifecycleBindings(process.env as unknown as LifecycleEnv)
}

// The Worker's `fetch` handler must call this with its explicit `env` before
// invoking TanStack's server entry, so lifecycleBindings() can resolve the
// real D1 binding instead of the absent process.env one. This must fail open:
// runtimes without the D1 binding do not break public static rendering.
export function initRequestLifecycleBindings(env: LifecycleEnv): void {
  try {
    requestBindings = resolveLifecycleBindings(env)
  } catch {
    // Missing/invalid env on this request must not leave a previous
    // request's bindings in place for this request to pick up.
    requestBindings = undefined
  }
}

// Test-only: clears the module-scoped request binding so tests don't leak
// state into each other.
export function resetRequestLifecycleBindings(): void {
  requestBindings = undefined
}

// The Worker's `scheduled` handler receives its bindings explicitly and must
// not depend on nodejs_compat populating process.env for a cron invocation.
export function lifecycleBindingsFromEnv(env: LifecycleEnv): LifecycleBindings {
  return resolveLifecycleBindings(env)
}
