import serverEntry from '@tanstack/react-start/server-entry'
import { initRequestLifecycleBindings, lifecycleBindingsFromEnv, type LifecycleEnv } from '#/lib/lifecycle/env.server'
import { recordOperationalHealth } from '#/lib/health.server'
import { runRetentionCleanup } from '#/lib/retention.server'

export default {
  fetch(request, env, _ctx) {
    // TanStack's server entry doesn't get an explicit `env` threaded through
    // to route handlers, so the Worker's real bindings (e.g. D1, which
    // Cloudflare never places in process.env) must be resolved here first.
    // This never throws (fail-open) so public routing survives on runtimes
    // without lifecycle bindings; lifecycle-specific handlers still fail
    // closed via lifecycleBindings().
    initRequestLifecycleBindings(env)
    return serverEntry.fetch(request)
  },
  async scheduled(_controller, env, ctx) {
    // Bindings are resolved from the Worker's own `env` here, not from
    // process.env: a scheduled invocation must not depend on nodejs_compat
    // having populated it the way request handling does.
    ctx.waitUntil(
      (async () => {
        const bindings = lifecycleBindingsFromEnv(env)
        // Each task is isolated so one operational failure never prevents the
        // other scheduled controls from running on this tick.
        await Promise.allSettled([
          recordOperationalHealth(bindings.db).catch(()=>{
            console.error('offscroll_health_monitor_failed')
          }),
          runRetentionCleanup(bindings.db).catch(()=>console.error('offscroll_retention_cleanup_failed')),
        ])
      })().catch(() => {
        console.error('scheduled_tick_failed')
      }),
    )
  },
} satisfies ExportedHandler<LifecycleEnv>
