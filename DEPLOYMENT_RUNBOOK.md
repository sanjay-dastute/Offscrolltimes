# Offscroll Times Deployment and Launch Runbook

This project is **not ready for production deployment** until a dedicated production database is created, provider secrets are installed, and the remaining release gates are completed. Domain and canonical routing target `offscrolltimes.com`.

## Required production inputs

- Final domain and Cloudflare zone/account ownership.
- Final legal entity, registered address, tax registrations, grievance officer and approved policies.
- Supported country list, transaction currency per country, tax treatment, shipping bands and `BUSINESS_TIME_ZONE` (currently India cut-off logic defaults to `Asia/Kolkata`).
- Google Cloud and Microsoft Entra production OAuth applications with exact callback URLs.
- Razorpay live key ID/secret and an independently generated webhook secret.
- Provider-qualified Google/Microsoft subject identifiers for the smallest possible `ADMIN_IDENTITY_IDS` allowlist. There is intentionally no operations role; the approved product has customer and administrator roles only.

## Infrastructure sequence

1. Create a new Cloudflare Worker and D1 database for Puzzle Post; do not reuse the former product database.
2. Replace the worker name, route patterns, database name/ID and canonical origins.
3. Apply migrations `0001` through `0017` in order, then call `/api/readiness`. Database readiness must be true.
4. Configure deployment secrets outside source control: `SESSION_SECRET`, `AUDIT_CHAIN_SECRET`, `EXPORT_SIGNING_SECRET`, `LIFECYCLE_SECRET`, Google, Microsoft, Razorpay and Turnstile credentials.
5. Configure DNS and both apex/`www` custom domains. Verify managed TLS, HSTS and the intended canonical redirect with GET and HEAD.
6. Replace `REPLACE_WITH_FINAL_DOMAIN` in `robots.txt` and `sitemap.xml`; use an absolute social-preview image URL after the domain is known.
7. Schedule `/api/health` externally and alert on non-200. `/api/readiness` should be used for deployment gating and normally returns 503 until every production provider is configured.
8. Configure alerts for Worker exceptions plus open `operational_alerts`. The minute scheduler records payment, transactional-message and delayed-webhook health.

## Release verification

- Run `pnpm audit --prod --audit-level moderate`, `pnpm run typecheck`, `pnpm test`, `pnpm run build` and `pnpm run security:client-bundle`.
- Perform Razorpay test purchases for each supported country/currency/payment-method combination, including success, failure, retry, timeout, duplicate webhook and refund.
- Generate, review, lock and export a disposable edition; move one record through prepared, dispatched, delayed, replacement and delivered states.
- Confirm completed orders preserve pricing, terms acceptance and fulfilment history.
- Run the manual browser/accessibility matrix in `UI_TEST_REPORT.md` and mobile Lighthouse/Web Vitals testing.
- Verify legal/business identity and obtain written India/Europe legal approval plus business-owner acceptance.
- Deploy in a recorded window, call health/readiness, smoke-test every public route and authentication boundary, complete one disposable purchase, verify webhook/email delivery, then refund it.

## Rollback

Keep the previous Worker deployment available, record the D1 Time Travel bookmark before migrations, and define the person authorized to roll back. Application rollback must not reverse already-recorded orders or payments. Follow `SECURITY_OPERATIONS.md` for backup, restoration and incident handling.
