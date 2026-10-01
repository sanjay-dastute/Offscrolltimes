# Administrator console

The console is at `/admin` with a separate username and password form. Set the
`ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` Worker secrets. The password hash format
is `pbkdf2-sha256-100000$<32 hex salt characters>$<64 hex digest characters>`.
Use a randomly generated password; keep plaintext passwords out of source control.
The ignored `admin-credentials.local` file contains the initial local credentials.
Login allows five attempts per IP and thirty total per fifteen minutes. Sessions
use a signed HttpOnly, Secure, SameSite=Strict cookie, expire after eight hours,
and become invalid when either credential changes. Admin mutations require CSRF.
When password login is configured, Google/Microsoft sessions cannot grant admin
access. Customer Google sign-in remains separate. Without password configuration,
the previous `ADMIN_IDENTITY_IDS` allowlist remains a compatibility fallback.

Apply all pending D1 migrations before using the updated console. Migration
`0028_customer_directory.sql` adds customer names and separate WhatsApp numbers
and preserves existing records. Use `pnpm run db:migrate:local` locally. Apply
production migrations to `LIFECYCLE_DB` only during the approved deployment.

- **Customers:** all registered accounts, including non-subscribers. Search by
  name, email, phone or WhatsApp; filter by subscription ownership. The directory
  uses server-side pagination with 25 users per page. Contact corrections require
  a reason and are audited. WhatsApp numbers use international format, such as
  `+917373050093`; an existing phone number is not assumed to be WhatsApp.
- **Subscriptions:** recipient names, full delivery addresses, subscription
  status, pricing and recorded payment/fulfilment history. Lists show 25 records
  per page with searchable filters. The overview currently loads complete
  commercial history to calculate totals rather than silently truncating it at
  500 records; very large installations should move those aggregates into SQL.
- **Offers:** create or edit discount rules and activate/deactivate saved codes.
  Date controls use the administrator's local timezone. Fixed amounts use minor
  currency units; percentage values use basis points. Eligibility, expiry and
  redemption limits are enforced by the existing server pricing calculation.
  Saved-offer previews and promotion reports remain in Catalogue.
- **Account:** customers can maintain their own name, contact email, phone and
  WhatsApp number. Contact email does not change the identity used to sign in.
- **Email signups:** footer subscriptions are stored separately from paid plans
  after explicit email-update consent. Migration `0029_newsletter_signups.sql`
  adds these records. Administrators can view paginated signups and unsubscribe
  them. A management link is shown after signup so users can unsubscribe without
  an account. Unsubscribe tokens are stored as hashes. No email campaign or
  confirmation message is sent by this feature; connect an email delivery service
  before sending updates and verifying email ownership.

Local verification on 1 October 2026 includes applying all D1 migrations,
TypeScript checking, the 56-test unit/integration suite, a production build,
and the client bundle secret scan. `pnpm run test:browser` exercises the customer
directory, pagination, audited contact correction, offer editing/activation and
customer WhatsApp form at desktop and mobile viewport sizes. Browser form tests
use controlled API fixtures; anonymous admin-access checks use the actual local
server. Database and authenticated ownership checks use real SQLite migrations
in the integration suite. This does not certify live Google/Microsoft callbacks.

Local Vite development disables remote bindings so it can run with local D1/R2
without a Cloudflare login. Production bindings remain in `wrangler.jsonc`.

Payment gateway credentials and live payment verification are outside this
update. Live activation requires Cloudflare authentication, production migration
application, the approved administrator's provider subject ID, and configured
Google/Microsoft applications. No Cloudflare login or real provider credentials
were available in this workspace during verification.
