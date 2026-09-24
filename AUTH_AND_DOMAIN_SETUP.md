# Offscroll Times Domain and Authentication Setup

## Confirmed DNS state

Checked on 22 September 2026:

- `offscrolltimes.com` is delegated to Cloudflare nameservers `ethan.ns.cloudflare.com` and `meiling.ns.cloudflare.com`.
- Apex and `www` resolve through Cloudflare proxy addresses.
- Zoho Mail MX records are present. Preserve all MX and mail-verification records when changing web routing.

The Worker configuration now declares `offscrolltimes.com` and `www.offscrolltimes.com` as custom domains. The application redirects `www` and HTTP traffic to `https://offscrolltimes.com`.

## Cloudflare deployment

### R2 private-file storage

R2 is used for private damage evidence, archived receipts, edition PDFs,
admin-managed product assets and archived dispatch exports. D1 stores the
searchable object metadata. The Worker accesses R2 through the
`OFFSCROLL_FILES` binding, so S3 access keys and account API tokens must not be
placed in Worker secrets or `.env`.

After Wrangler authentication, create isolated production and preview buckets:

```powershell
pnpm exec wrangler r2 bucket create offscroll-times-production-files
pnpm exec wrangler r2 bucket create offscroll-times-preview-files
pnpm exec wrangler r2 bucket list
```

Keep both buckets private. Do not attach a public development URL or custom
domain. Authorized application routes stream private objects; only product
assets explicitly marked `published` can use `/api/assets/{recordId}`.

The binding is declared in `wrangler.jsonc`; no R2 credential is required by
the deployed Worker. Migration `0027_private_object_storage.sql` creates the D1
metadata table.

Any token or access key disclosed in chat, tickets, screenshots or source code
must be revoked and replaced before use. Store replacement credentials only in
the approved secret manager.

### 1. Authenticate Wrangler

From the project directory, install dependencies and authenticate with the
Cloudflare account that owns `offscrolltimes.com`:

```powershell
pnpm install
pnpm exec wrangler login
pnpm exec wrangler whoami
```

The final command must show the intended production account. Do not continue
under a personal or test account by mistake.

### 2. Create the dedicated production D1 database

```powershell
pnpm exec wrangler d1 create offscroll-times-production
```

Wrangler prints a binding example containing a `database_id`. Copy only that
new database UUID. In `wrangler.jsonc`, retain:

```jsonc
{
  "binding": "LIFECYCLE_DB",
  "database_name": "offscroll-times-production",
  "database_id": "PASTE_THE_NEW_D1_DATABASE_UUID_HERE",
  "migrations_dir": "migrations"
}
```

Replace the current all-zero sentinel. Do not change the `LIFECYCLE_DB`
binding name because the Worker expects it. Do not reuse a legacy database ID.

Confirm the new database is visible:

```powershell
pnpm exec wrangler d1 list
pnpm exec wrangler d1 info offscroll-times-production
```

### 3. Apply and verify production migrations

First review the pending migration list, then apply it remotely:

```powershell
pnpm exec wrangler d1 migrations list offscroll-times-production --remote
pnpm exec wrangler d1 migrations apply offscroll-times-production --remote
```

Migration `0026_india_launch_pricing.sql` starts the 30-day launch-offer window
when it is applied. Apply it on the actual launch schedule, not weeks in
advance. It configures INR pricing and free India delivery.

Verify the essential tables and production pricing without exposing customer
records:

```powershell
pnpm exec wrangler d1 execute offscroll-times-production --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
pnpm exec wrangler d1 execute offscroll-times-production --remote --command "SELECT duration_months, amount_minor, currency, active, discount_basis_points FROM admin_subscription_options ORDER BY duration_months;"
pnpm exec wrangler d1 execute offscroll-times-production --remote --command "SELECT country_code, currency, shipping_minor, active FROM admin_shipping_zones ORDER BY country_code;"
```

Expected active plans are 1, 3, and 12 months in INR. India must be the only
active shipping zone and its shipping amount must be zero.

### 4. Add production secrets

Fill `.env` locally as a private worksheet. It is already excluded by
`.gitignore`. Do not commit it and do not place secret values in
`wrangler.jsonc`.

For every secret below, run the command and paste its value only when Wrangler
prompts. This prevents the secret appearing in shell history:

```powershell
pnpm exec wrangler secret put SESSION_SECRET
pnpm exec wrangler secret put LIFECYCLE_SECRET
pnpm exec wrangler secret put AUDIT_CHAIN_SECRET
pnpm exec wrangler secret put EXPORT_SIGNING_SECRET
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put MICROSOFT_CLIENT_ID
pnpm exec wrangler secret put MICROSOFT_CLIENT_SECRET
pnpm exec wrangler secret put RAZORPAY_KEY_ID
pnpm exec wrangler secret put RAZORPAY_KEY_SECRET
pnpm exec wrangler secret put RAZORPAY_WEBHOOK_SECRET
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put ADMIN_IDENTITY_IDS
```

`VITE_TURNSTILE_SITE_KEY` is public, not secret. Add it under `vars` in
`wrangler.jsonc` before the production build or configure it as a Cloudflare
build variable. `AUTH_ALLOWED_ORIGINS` and `BUSINESS_TIME_ZONE` are already
declared as non-secret Worker variables. Add `BUSINESS_CUTOFF_DAY` and
`FULFIL_PAID_AFTER_CANCELLATION` to `vars` if their defaults must change.

Generate each server secret independently. One PowerShell option is:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

Run it four times; do not reuse a generated value between secret names.
Confirm only the secret names—not their values—are present:

```powershell
pnpm exec wrangler secret list
```

### 5. Deploy and verify

```powershell
pnpm run typecheck
pnpm test
pnpm run build
pnpm run security:client-bundle
pnpm run deploy
```

After deployment:

1. Open `https://offscrolltimes.com/api/health` and `/api/readiness`.
2. Confirm the readiness response reports Google, Microsoft, Razorpay and
   session security as configured.
3. Test Google and Microsoft sign-in with new and returning accounts.
4. Complete a Razorpay test/live-mode transaction appropriate to the launch
   stage and confirm the subscription appears only after server verification.
5. Verify `https://www.offscrolltimes.com` redirects to the apex HTTPS domain.
6. In Cloudflare SSL/TLS, use **Full (strict)**, enable **Always Use HTTPS** and
   retain Universal SSL.
7. Preserve all existing Zoho MX, SPF, DKIM and DMARC records.

### 6. Backup and rollback preparation

Before accepting live orders, export a baseline backup:

```powershell
New-Item -ItemType Directory -Force -Path backups
pnpm exec wrangler d1 export offscroll-times-production --remote --output backups/offscroll-times-production-baseline.sql
pnpm run db:verify-backup -- backups/offscroll-times-production-baseline.sql
```

Keep production backups encrypted and outside the repository. Test restoration
into a separate disposable D1 database; never test restoration over production.

Database backup automation must run outside the application Worker using a
separate least-privilege Cloudflare API token. Do not give the public Worker an
account token or permission to administer D1/R2 resources. If backups are later
copied into R2, use a dedicated backup bucket and a separate automation identity;
do not mix backups with customer-uploaded files.

Do not delete the existing Zoho MX, SPF, DKIM or DMARC records while configuring the website.

## Google OAuth

Create a Web application OAuth client in the client-owned Google Cloud project.

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://offscrolltimes.com`
- `https://www.offscrolltimes.com`

Authorized redirect URIs:

- `http://localhost:3000/auth/google/callback`
- `https://offscrolltimes.com/auth/google/callback`
- `https://www.offscrolltimes.com/auth/google/callback`

Use scopes `openid email profile`. Configure the consent screen with Offscroll Times branding, the production homepage, privacy policy and terms URLs. Add the resulting client ID and secret as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Microsoft / Outlook OAuth

Create an application registration in the client-owned Microsoft Entra tenant. Select **Accounts in any organizational directory and personal Microsoft accounts** so Outlook.com customers are supported.

Web redirect URIs:

- `http://localhost:3000/auth/microsoft/callback`
- `https://offscrolltimes.com/auth/microsoft/callback`
- `https://www.offscrolltimes.com/auth/microsoft/callback`

The application already uses the Microsoft `common` OpenID Connect authority and requests `openid email profile`. Create a client secret, record its **value** once, and store the application client ID and secret value as `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.

## Production verification

- Test new-account and returning-account login through both providers.
- Test denial, invalid state, expired transaction, logout and sign-out-all-devices.
- Confirm provider linking requires an existing authenticated session.
- Add administrators only by provider-qualified subject in `ADMIN_IDENTITY_IDS`; never authorize by email domain.
- Rotate any credential pasted into chat, email, documentation or source control.
