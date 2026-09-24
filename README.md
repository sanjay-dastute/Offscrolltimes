# Offscroll Times

Offscroll Times is a Cloudflare-hosted subscription application for a monthly physical puzzle newspaper with free delivery across India. International customers can enquire before ordering.

## Stack

- TanStack Start and React
- Cloudflare Workers and D1
- Google and Microsoft OpenID Connect
- Razorpay hosted checkout and signed webhooks
- First-party consent-controlled analytics

## Local development

```bash
pnpm install
pnpm run dev
```

Copy `.dev.vars.example` to `.dev.vars` and provide development credentials. Never commit `.dev.vars` or any secret.

The local application runs at `http://localhost:3000`.

`pnpm run dev` applies pending local D1 migrations before starting Vite. To apply them separately, run `pnpm run db:migrate:local`. These commands do not migrate the production database.

Keep `.wrangler/state`: it contains local database and object-storage data, not just disposable cache. Deleting it loses local records. Reapplying migrations restores the schema and seed data, but does not recover deleted customer or order records.

## Verification

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run security:client-bundle
pnpm audit --prod --audit-level high
```

## Production

The canonical origin is `https://offscrolltimes.com`. Read:

- `AUTH_AND_DOMAIN_SETUP.md`
- `DEPLOYMENT_RUNBOOK.md`
- `SECURITY_OPERATIONS.md`
- `QUALITY_GATE_STATUS.md`
- `FINAL_DEVELOPMENT_PLAN.md`

Create a dedicated production D1 database and replace the temporary database ID in `wrangler.jsonc` before deployment. Install secrets with `wrangler secret put`; do not store production credentials in source control.
