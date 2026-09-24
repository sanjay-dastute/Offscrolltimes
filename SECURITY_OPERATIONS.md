# Security Operations Runbook

## Ownership and access

- Production administration is restricted by `ADMIN_IDENTITY_IDS`. Review it monthly and immediately after any staff change.
- Use individual Google or Microsoft identities. Never share administrator accounts or export files.
- Give Cloudflare, Google/Microsoft and Razorpay access only to people who need it. Require MFA in each provider.
- Remove a departing administrator from the allowlist and provider accounts before their access-ending time, then rotate any secret they could have viewed.

## Secrets and encryption

- Store `SESSION_SECRET`, `AUDIT_CHAIN_SECRET`, `EXPORT_SIGNING_SECRET`, `BACKUP_ENCRYPTION_KEY`, OAuth secrets, Razorpay secrets and lifecycle secrets only in deployment or CI secret configuration.
- Use independent random values of at least 32 bytes for session, audit-chain, export, and lifecycle encryption purposes.
- Rotate immediately after suspected exposure. Rotate provider secrets in the provider console, update deployment secrets, deploy, verify sign-in/payment webhooks, then revoke the old value. A session-secret rotation signs everyone out; an export-secret rotation invalidates outstanding export grants. Rotate the backup key by creating and verifying a fresh backup before retiring the old key; retain old keys only as long as their encrypted backups.
- TLS is mandatory in production. Session and OAuth data is AES-GCM encrypted in host-only cookies. Raw card data is handled only by Razorpay.

## Monitoring and privacy

- Review failed authentication, webhook rejection, payment failure, rate-limit, export, and administrator audit events weekly.
- Logs must contain event categories and opaque IDs only. Never log email bodies, postal addresses, access tokens, cookies, provider secrets, raw webhook payloads, or full dispatch exports.
- Treat every dispatch CSV as confidential. Grants expire after two minutes, responses are non-cacheable, and downloaded files must be deleted after the printer/courier confirms secure ingestion.

## Backup and restoration

Cloudflare D1 Time Travel is the primary point-in-time recovery mechanism. Check the database backend and current bookmark before every migration:

```bash
pnpm wrangler d1 info mounika-2026
pnpm wrangler d1 time-travel info mounika-2026
```

The scheduled GitHub workflow `.github/workflows/encrypted-d1-backup.yml` creates a daily export, verifies it, encrypts it with AES-256-GCM and performs an in-memory restoration check before uploading only the encrypted artifact. Configure `CLOUDFLARE_D1_BACKUP_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `BACKUP_ENCRYPTION_KEY` as repository secrets. The Cloudflare token must be limited to D1 read/export access.

For a manual export:

```bash
pnpm wrangler d1 export offscroll-times-production --remote --output=BACKUP_FILE.sql
pnpm db:verify-backup BACKUP_FILE.sql
node scripts/encrypt-backup.mjs BACKUP_FILE.sql BACKUP_FILE.enc
pnpm db:verify-encrypted-backup BACKUP_FILE.enc
```

Never commit an export. Store it in approved encrypted storage with restricted access and the retention schedule from `data_retention_policies`.

Test restoration quarterly using a disposable non-production database. Run the verification command first, import with `wrangler d1 execute DISPOSABLE_DATABASE --remote --file=BACKUP_FILE.sql`, validate row counts and a sample customer/order/fulfilment journey, then destroy the disposable database through the approved Cloudflare process. Production Time Travel restoration is destructive and requires incident-lead approval, a recorded current bookmark, and a maintenance window.

## Incident response

1. Contain: disable affected administrator access, payment/webhook credentials, exports, or deployment access.
2. Preserve: record timestamps, opaque affected record IDs, audit-chain head, D1 bookmark, provider event IDs, and relevant provider audit logs. Do not copy unnecessary personal data into tickets.
3. Assess: identify affected systems, data categories, people, countries, and whether confidentiality, integrity, or availability was harmed.
4. Recover: rotate affected secrets, patch the cause, verify webhook signatures and audit-chain continuity, restore from an approved bookmark only if necessary, and test critical customer flows.
5. Notify: escalate immediately to the incident lead and privacy/legal owner. Follow the applicable contractual and statutory notification deadlines for every affected jurisdiction.
6. Review: document cause, impact, decisions, customer communication, and corrective actions. Assign owners and completion dates.

Provider access revocation order: application admin allowlist, active application sessions, Google/Microsoft, Cloudflare, Razorpay, source control, then any printer/courier transfer account.

## Retention execution

The scheduled Worker enforces short-lived retention daily/minutely with idempotent cleanup: expired OAuth transactions are removed after 24 hours, and expired or revoked sessions after 30 days. Resolved enquiries are anonymised after 24 months. Dispatch export grants expire after two minutes and are never persisted. Audit and legally required commercial records remain append-only for eight years and require legal approval before any later anonymisation or disposal.
