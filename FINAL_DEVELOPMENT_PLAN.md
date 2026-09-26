# Offscroll Times — Final Development Plan

> Document purpose: final pre-development specification and delivery checklist.
>
> Delivery approach: one complete production release. The numbered sections define implementation order and acceptance requirements, not separate commercial phases.
>
> This document supersedes earlier decisions in `PROJECT_PLAN.md` where they conflict with this plan, particularly the previous use of Whop authentication.

## 1. Confirmed Product Decisions

### Latest approved changes — 25 September 2026

These decisions supersede the earlier prepaid/manual-renewal and no-newsletter requirements below. The current payment implementation remains prepaid until the recurring flow is implemented and tested.

- [x] Requested billing model: charge monthly and continue until cancelled, including the discounted 3- and 12-month options.
- [ ] Confirm the monthly rate after the launch offer's first year.
- [ ] Implement Razorpay Subscriptions authorisation, recurring charge verification, failure handling and provider cancellation; grant only entitlement paid for each month.
- [ ] Migrate pricing, checkout, account controls and payment-related copy together; existing prepaid purchases must retain their original terms and entitlement.
- [x] Blog email subscriptions are now requested on Home and Subscription pages.
- [ ] Supply the approved email service's hosted signup URL, with subscriber consent and unsubscribe management. The visible blog section currently announces availability as coming soon.
- [ ] Activate blog signup after that service is configured.

- [x] Brand name: **Offscroll Times**.
- [x] Product: a physical monthly puzzle newspaper delivered by post.
- [x] Markets: India first, with selected European countries enabled only after shipping, tax and legal confirmation.
- [x] Roles: visitor, customer and administrator.
- [x] Authentication: Google and Microsoft OpenID Connect; no Whop dependency.
- [x] Payments: Razorpay hosted/tokenised checkout; the application never stores raw card or UPI credentials.
- [x] Commercial model: prepaid subscription terms selected by duration.
- [x] Initial durations: 1, 3, 6 and 12 months, configurable by administrators.
- [x] Renewal: manual by default; no automatic renewal unless separately approved later.
- [x] Fulfilment: one physical copy per paid month, multiplied by quantity.
- [x] Hosting: Cloudflare Workers and static assets.
- [x] Database: Cloudflare D1.
- [x] File storage: Cloudflare R2 only when product media or operational files cannot remain static assets.
- [x] No application-managed email delivery provider is required for the initial release.
- [x] Bot protection: Cloudflare Turnstile on abuse-sensitive public forms.
- [x] No newsletter signup, marketing list or promotional-email system.
- [x] Order, subscription and fulfilment updates are available in the secure customer dashboard.
- [x] Existing internal identifiers such as `puzzle-post` may remain temporarily for data compatibility but must never appear to customers.

## 2. Application Architecture

```text
Visitor / Customer / Administrator
                |
                v
       Offscroll Times website
        Cloudflare Worker
                |
       +--------+---------+----------------+
       |                  |                |
       v                  v                v
Google / Microsoft   Cloudflare D1      Cloudflare R2
OpenID Connect       application data   product/media files
       |                  |
       |                  +-------------------------+
       |                                            |
       v                                            v
Secure application session                 Razorpay order/payment API
                                                    |
                                                    v
                                         Signed Razorpay webhooks
                                                    |
                                                    v
                                      Activate local paid entitlement
                                                    |
                               +--------------------+------------------+
                               v                                       v
                    Customer dashboard                      Admin fulfilment
                               |
                               v
                   In-app status and receipts
```

### Source-of-truth rules

- [ ] Google and Microsoft are the source of truth only for authentication identity.
- [ ] Razorpay is the source of truth for payment processing status and provider references.
- [ ] D1 is the source of truth for customers, orders, pricing snapshots, paid entitlement, subscriptions, editions and fulfilment.
- [ ] The browser is never trusted to confirm payment, price, role or subscription ownership.
- [ ] An authenticated provider email is not used as the permanent primary key.

## 3. Roles and Permissions

### Visitor

- [x] Browse Home, About, Subscription, FAQ, Contact and Legal pages without signing in.
- [x] View plan durations, prices, delivery regions and sample pages.
- [x] Calculate an indicative total without creating an order.
- [x] Contact support through the protected enquiry form or WhatsApp.
- [x] Sign in with Google or Microsoft when beginning checkout. (Provider credentials remain a deployment input.)

### Customer

- [x] Access only records connected to their internal user ID.
- [x] View current and previous subscriptions.
- [x] View start date, paid-through date, copies fulfilled and copies remaining.
- [x] View payments, receipts, editions, dispatches and tracking information.
- [x] Update delivery address before the configured monthly cut-off.
- [x] Request pause or cancellation only when the final policy permits it.
- [x] Renew by selecting and purchasing a new prepaid term.
- [ ] Link a second login provider from an already authenticated account.
- [x] Request account access, correction or deletion subject to legal retention duties.

### Administrator

- [x] Use an explicitly authorised account; never infer administrator access from an email domain.
- [x] View customer, subscription, payment, edition and fulfilment records.
- [x] Manage products, duration options, prices, countries, taxes and shipping rules.
- [x] Create and manage eligible promotions.
- [x] Correct addresses with a required reason and audit record.
- [x] Pause, resume, cancel, complete or record a refund with confirmation and audit controls.
- [x] Create monthly editions and generate eligibility snapshots.
- [x] Review exclusions, document overrides, lock print lists and export dispatch CSV files.
- [x] Update fulfilment and shipment states.
- [x] Manage enquiries and private staff notes.
- [x] View operational, commercial and audit reports.
- [x] Never access raw payment credentials, OAuth secrets or session tokens.

## 4. Authentication and Account Flow

### Provider configuration

- [ ] Create separate development and production Google OAuth applications.
- [x] Configure Google scopes as `openid email profile` only in the application request.
- [ ] Register exact Google callback URLs for local and production environments.
- [ ] Verify the production domain and complete the Google consent-screen branding.
- [ ] Create a Microsoft Entra application registration.
- [ ] Enable organisational and personal Microsoft accounts in the client-owned Entra registration.
- [x] Use the Microsoft `common` authority for supported customer accounts.
- [ ] Register exact Microsoft callback URLs for local and production environments.
- [x] Store client IDs and secrets only in deployment secrets; no provider secret is included in browser code or OAuth redirects.

### Sign-in flow

1. [x] Customer selects `Continue with Google` or `Continue with Microsoft`.
2. [x] Server creates a short-lived OAuth transaction containing state, nonce and PKCE data.
3. [x] Browser is redirected to the selected provider.
4. [x] Provider returns an authorisation code to the registered callback.
5. [x] Server validates state and exchanges the code securely.
6. [x] Server validates token signature, issuer, audience, nonce and expiry.
7. [x] Server finds or creates an `auth_identity` using provider plus provider subject.
8. [x] Server finds or creates the associated internal user/customer.
9. [x] Server creates a hashed, revocable application session.
10. [x] Browser receives only a Secure, HttpOnly, SameSite session cookie.
11. [x] Customer returns to the original safe local destination.

### Account linking and collision rules

- [x] Allow provider linking only from an authenticated profile.
- [x] Require a fresh provider authentication before linking.
- [x] Never automatically merge two existing accounts solely because emails match.
- [x] Record provider linking and unlinking in the security audit trail.
- [x] Prevent removal of the customer's final usable login method.
- [x] Support session revocation on logout and through `Sign out all devices`; provider account recovery remains with Google or Microsoft.
- [ ] Require stronger administrator protection, including application TOTP MFA before launch.

## 5. Public Website Flow

### Global interface

- [x] Use the Offscroll Times wordmark consistently.
- [x] Provide responsive Home, About, Subscription, FAQ, Contact and Legal navigation.
- [x] Keep `Choose your subscription` as the primary purchase action.
- [x] Provide account access and a non-blocking WhatsApp action.
- [x] Preserve keyboard access, visible focus and screen-reader labelling.

### Envelope introduction

- [x] Show the full newspaper inside the envelope before opening.
- [x] Open only through the primary envelope action; do not show a skip control.
- [x] Reveal the page without hiding essential content from assistive technology.
- [x] Respect `prefers-reduced-motion`.
- [x] Avoid replaying the animation unnecessarily during the same browser session.

### Home

- [x] Explain what Offscroll Times is in one clear value proposition.
- [x] Show original product photography or approved mock-ups.
- [x] Show issue contents, benefits, audience use cases and delivery regions.
- [x] Include sample-page previews without exposing complete answers.
- [x] Explain purchase-to-delivery in three or four steps.
- [x] Display transparent plan prices and repeat the subscription action appropriately.
- [ ] Show only genuine, approved testimonials.
- [x] Include a short FAQ preview.
- [x] Do not include newsletter or marketing-consent controls.

### About

- [ ] Publish approved founder/team information and real photography.
- [x] Explain original content, regional relevance, production quality and play testing.
- [x] Show ideation, design, testing, printing and delivery workflow.
- [ ] Use original images, sketches and publication prototypes.

### FAQ

- [x] Group questions by publication, subscription, payment, delivery, cancellation and account.
- [x] Explain cut-offs with dated examples.
- [x] Explain start/end dates, address deadlines and manual renewal.
- [x] Explain damaged, delayed and missing-copy support per region.
- [x] Use searchable, accessible accordion behaviour.

### Contact

- [x] Support general, order-support, bulk-order and partnership enquiries.
- [x] Collect only the minimum fields required for the selected enquiry.
- [x] Apply server validation, Turnstile and rate limits.
- [x] Display business hours, response expectations, support email and WhatsApp.
- [x] Return a reference number after successful submission.
- [x] Store status and private administrator notes securely.

## 6. Subscription Selection and Authoritative Pricing

### Customer selection

- [x] Show configurable 1-, 3-, 6- and 12-month options.
- [x] Show base monthly price, term discount and exact savings.
- [x] Calculate copies as `duration months × quantity`.
- [x] Support eligible country and promotion selection.
- [x] Display the first eligible edition and estimated first dispatch.
- [x] State clearly that payment covers the selected prepaid term.
- [x] State clearly that renewal is manual.
- [x] Provide a usable sticky mobile summary.

### Server-side formula

```text
subtotal = base monthly price × duration months × quantity
duration discount = configured percentage or amount
promotion discount = validated eligible promotion
shipping = destination shipping rule + quantity adjustment
taxable amount = subtotal - valid discounts + taxable shipping
tax = tax rule for the validated customer context
final total = subtotal - discounts + shipping + tax
```

- [x] Calculate the authoritative quote only on the server.
- [x] Store money in integer minor units.
- [x] Apply only active, compatible and eligible discounts.
- [x] Recalculate before payment order creation.
- [x] Store an immutable pricing snapshot on the commercial order.
- [x] Prevent future price changes from modifying historical orders.

## 7. Checkout and Razorpay Flow

1. [x] Customer selects term, quantity, country and optional promotion.
2. [x] Customer signs in if no valid application session exists.
3. [x] Customer provides validated contact and delivery-address details.
4. [x] Server calculates the authoritative final quote.
5. [x] Customer reviews duration, copies, subtotal, discounts, shipping, tax and total.
6. [x] Customer explicitly accepts subscription, cancellation and privacy terms.
7. [x] Server creates a pending immutable local order with an idempotency key.
8. [x] Server creates the matching Razorpay order using server-only credentials.
9. [x] Razorpay Checkout collects payment details outside application storage.
10. [x] Browser success is treated only as pending verification.
11. [x] Server verifies Razorpay callback/webhook signatures.
12. [x] Server deduplicates repeated webhook events.
13. [x] Verified capture marks the payment paid and activates entitlement atomically.
14. [x] Application generates the receipt and displays verified confirmation in the customer account.
15. [x] Customer sees the subscription and first expected edition in the dashboard.

### Failure and refund handling

- [ ] Handle failed, cancelled, timed-out and abandoned payment states.
- [x] Provide a safe retry that reuses or supersedes the pending order without duplicating entitlement.
- [x] Store webhook receipts and processing outcomes.
- [x] Record refunds only after verified Razorpay confirmation.
- [ ] Recalculate affected entitlement according to the approved refund policy.
- [x] Preserve historical orders, payments and audit records.

## 8. Subscription and Entitlement Rules

- [x] Store start date, paid-through date, duration, quantity and total entitled copies.
- [x] Maintain copies fulfilled and copies remaining from confirmed fulfilment records.
- [x] Define statuses: upcoming, active, paused, cancelled, completed, refunded and payment-failed.
- [x] Keep commercial status separate from paid entitlement.
- [x] Prevent the same subscription receiving the same edition twice without an audited override.
- [x] Stop future unpaid renewal after cancellation.
- [x] Continue already-paid fulfilment only when the approved policy requires it.
- [x] Complete a subscription automatically when all paid copies are fulfilled.
- [x] Store all dates in UTC and apply the configured business timezone for cut-offs.

## 9. Customer Dashboard Flow

- [x] Show profile identity and linked login providers.
- [x] Show current and previous subscriptions.
- [x] Show status, term, start/end dates and copies remaining.
- [x] Show the next eligible edition and estimated dispatch date.
- [x] Show payment, receipt, fulfilment and delivery history.
- [x] Allow address changes before cut-off.
- [x] Warn when an address change can apply only to later editions.
- [x] Offer renewal through a new duration selection and checkout.
- [x] Explain pause/cancellation effects before confirmation.
- [x] Provide privacy-request and account-deletion controls.
- [x] Provide contact and WhatsApp support without exposing internal notes.

## 10. Administrator Application Flow

### Dashboard

- [x] Show customers, active paid entitlements, upcoming expirations, cancellations and completed terms.
- [x] Show copies required for the next edition.
- [x] Show payment, address, fulfilment and delivery exceptions.
- [x] Show revenue, discount cost, refunds and country distribution.

### Customer and subscription management

- [x] Search by customer, email, phone, country, status and duration.
- [x] View dates, pricing snapshot, paid entitlement, payments and fulfilment history.
- [x] Correct addresses with reason, confirmation and audit history.
- [x] Apply valid subscription status transitions with permission checks.
- [x] Prevent deletion of commercial, payment, fulfilment and audit history.

### Catalogue and promotions

- [x] Manage products, base prices, durations and duration discounts.
- [x] Manage supported countries, currencies, shipping and tax rules.
- [x] Create percentage, fixed-value and free-shipping promotions.
- [x] Configure dates, usage limits, customer limits and eligibility rules.
- [x] Preview promotion results before activation.
- [x] Report redemption count, attributed revenue and discount cost.

### Edition and fulfilment workflow

1. [x] Create edition name, number, cut-off and dispatch date.
2. [x] Generate a frozen eligibility snapshot from paid entitlement.
3. [x] Display included and excluded subscriptions with reasons.
4. [x] Allow documented authorised overrides before locking.
5. [x] Approve and lock the print list.
6. [x] Generate a short-lived, least-data dispatch CSV export.
7. [x] Mark prepared, dispatched, delivered, delayed, returned or replacement.
8. [x] Decrease copies remaining only according to the confirmed fulfilment rule.
9. [x] Preserve the complete edition audit history.

## 11. In-App Status, Receipts and Support

- [x] Show payment confirmation and a downloadable receipt after server-side verification.
- [x] Show subscription activation in the customer dashboard.
- [x] Show address-change confirmation and the edition from which it applies.
- [x] Show dispatch status, courier and tracking details.
- [x] Show pause, cancellation, completion and verified refund outcomes.
- [x] Show a manual-renewal reminder near the end of the paid term.
- [x] Include Offscroll Times business and support information on receipts and account pages.
- [x] Maintain a customer-visible account activity history without exposing internal notes.
- [x] Store contact enquiries in the administrator panel; staff may respond using the published support channel.
- [x] Do not create a marketing list, newsletter system or application-managed email pipeline.
- [x] Treat any optional notifications sent directly by Razorpay as provider functionality, not as the application's source of truth.

## 12. Final Data Model

- [x] `users`: internal identity, primary email, role and account state.
- [x] `auth_identities`: provider, permanent provider subject and verified claims.
- [x] `oauth_transactions`: short-lived state, nonce and PKCE transaction data.
- [x] `sessions`: hashed token, expiry, revocation and security metadata.
- [x] `mfa_factors`: administrator TOTP configuration and recovery state.
- [x] `customers`: customer profile and privacy metadata.
- [x] `addresses`: versioned billing and delivery addresses.
- [x] `products`: publication product and availability.
- [x] `subscription_options`: duration, base price, discount and active state.
- [x] `orders`: immutable commercial order and pricing snapshot.
- [x] `payments`: Razorpay identifiers, amount, currency and verified status.
- [x] `subscriptions`: dates, status, paid entitlement and copies remaining.
- [x] `editions`: issue number, cut-off, dispatch date and lock state.
- [x] `edition_eligibility`: frozen inclusion/exclusion decision and reason.
- [x] `fulfilments`: unique subscription entitlement per edition.
- [x] `shipments`: courier, tracking, status and dispatch events.
- [x] `promotions`: eligibility, value, validity and usage limits.
- [x] `promotion_redemptions`: customer/order usage history.
- [x] `enquiries`: category, customer, message, status and resolution.
- [x] `refunds`: amount, reason, Razorpay status and affected entitlement.
- [x] `webhook_receipts`: provider event identity, deduplication and processing outcome.
- [x] `account_events`: customer-visible status, related record and safe activity summary.
- [x] `audit_events`: actor, action, target, timestamp and tamper-evident summary.

### Initial storage forecast

- [x] Estimate structured storage at approximately 50–100 KB per active customer per year after indexes and operational history.
- [x] Forecast 1,000 customers at approximately 50–100 MB.
- [x] Forecast 10,000 customers at approximately 500 MB–1 GB.
- [x] Keep product images, sample issues and large files outside D1.
- [x] Set retention rules for OAuth transactions, sessions, enquiries, exports, audit records and legally required commercial records.
- [x] Add automated encrypted backups and test restoration before launch.

## 13. Security and Privacy

- [x] Enforce authentication and role authorisation server-side.
- [x] Enforce record ownership on every customer query and mutation.
- [x] Protect cookies with Secure, HttpOnly and SameSite attributes.
- [x] Protect state-changing browser requests against CSRF.
- [x] Validate and normalise all browser, OAuth and webhook input server-side.
- [x] Verify Google and Microsoft tokens and Razorpay webhook signatures as applicable.
- [x] Rate-limit sign-in, callback, contact, coupon and checkout endpoints.
- [x] Apply Turnstile to appropriate abuse-sensitive forms.
- [x] Encrypt sensitive data in transit and at rest where appropriate.
- [x] Keep secrets outside source control and rotate them through an approved procedure.
- [x] Prevent personal data, tokens and secrets from entering logs or analytics.
- [x] Maintain tamper-evident administrator audit history.
- [x] Restrict and time-limit fulfilment exports.
- [x] Add backup, incident-response and access-revocation procedures.

## 14. Legal and Compliance

- [x] Publish Terms and Conditions.
- [x] Publish Privacy Policy naming Google, Microsoft, Razorpay and Cloudflare where applicable.
- [x] Publish Cookie Policy and preferences if non-essential cookies are introduced.
- [x] Publish Subscription and Manual Renewal Terms.
- [x] Publish Shipping and Delivery Policy.
- [x] Publish Cancellation, Return, Refund and Replacement Policy.
- [x] Publish Accessibility Statement.
- [ ] Display legal business identity, address and grievance/support contact.
- [x] Disclose complete price, tax, delivery, term, renewal and cancellation conditions before payment.
- [x] Support applicable privacy access, correction and deletion requests.
- [x] Review Indian DPDP, e-commerce, consumer and tax requirements.
- [x] Review GDPR, ePrivacy, consumer-contract, VAT and country-specific European obligations.
- [ ] Obtain qualified Indian and European legal review before production launch.

## 15. Analytics and Reporting

- [x] Keep operational reporting functional without third-party marketing trackers.
- [x] Obtain consent before optional page-view or funnel analytics where required.
- [x] Track duration selection, checkout start, verified purchase and payment failure without unnecessary personal data.
- [x] Track promotion redemption without exposing coupon values in analytics.
- [x] Report active paid entitlement rather than relying only on subscription status.
- [x] Report required and dispatched copies by country.
- [x] Report cancellations, refunds, completion, renewal and retention.
- [x] Report address, payment and delivery exceptions.

## 16. Testing and Quality Gates

### Functional

- [ ] Test Google and Microsoft login, denial, callback, logout and session expiry.
- [x] Test provider linking, collision prevention and session revocation.
- [x] Test customer/admin authorisation and direct-object access attempts.
- [x] Test every configured duration, quantity, discount, shipping, tax and currency combination.
- [x] Test valid, invalid, expired, exhausted and incompatible promotions.
- [ ] Test Razorpay success, failure, cancellation, timeout, retry, duplicate webhook and refund.
- [x] Test exact cut-off boundaries in the configured business timezone.
- [x] Test all subscription and fulfilment states.
- [x] Test address changes before and after cut-off.
- [ ] Test edition generation, override, locking, export, dispatch and replacement.
- [ ] Test in-app confirmations, receipts and account activity; prove that no marketing list is populated.

### Accessibility and compatibility

> Release gate: automated source-level accessibility contracts pass, but the items below remain open until the browser/device and assistive-technology matrix in `QUALITY_GATE_STATUS.md` is executed.

- [ ] Test supported mobile and desktop browsers.
- [ ] Test keyboard-only navigation and visible focus.
- [ ] Test screen-reader names, landmarks, headings, forms, tables and dialogs.
- [ ] Test text resizing, zoom, contrast, reduced motion and error identification.
- [ ] Test slow networks, loading, empty and failed API states.
- [ ] Confirm WhatsApp works on mobile and desktop without blocking controls.
- [ ] Meet WCAG 2.2 AA requirements.

### Security and performance

- [ ] Test CSRF, OAuth state/nonce, injection, replay, brute force and webhook forgery protections.
- [x] Verify tokens, secrets and test personal-data markers are absent from client bundles.
- [x] Scan production dependencies and resolve high-risk findings.
- [ ] Optimise images, fonts, JavaScript, caching and Core Web Vitals.
- [x] Pass production build, type checking, unit tests and integration tests.
- [ ] Complete an independent pre-launch security review proportional to risk.

## 17. Implementation Order

- [x] Remove Whop UI, routes, SDK use, webhooks, identifiers and environment requirements.
- [x] Add Google/Microsoft provider configuration and environment validation.
- [x] Add the new authentication, identity, session and MFA migrations.
- [x] Implement OAuth initiation, callback validation, session management and logout.
- [x] Migrate customer ownership from legacy provider user IDs to internal owner IDs.
- [ ] Update checkout, account and admin authorisation to use internal sessions.
- [ ] Complete authoritative Razorpay order, verification, webhook and refund workflows.
- [x] Complete subscription entitlement and customer-dashboard integration.
- [x] Complete administrator catalogue, promotion, edition and fulfilment workflows.
- [x] Complete in-app status, receipt generation and operational monitoring.
- [x] Remove all newsletter surfaces and legacy C-Corp/Whop branding/configuration.
- [ ] Execute full test, security, accessibility and performance suites.
- [ ] Complete production configuration, legal review and launch acceptance.

## 18. Deployment and Operations

- [ ] Configure `offscrolltimes.com`, DNS, TLS and canonical redirects.
- [ ] Configure production Worker, D1, migrations, R2 and restoration procedure.
- [ ] Configure Google and Microsoft production credentials and callbacks.
- [ ] Configure Razorpay production keys and signed webhook destination.
- [ ] Configure session, audit, export and encryption secrets independently.
- [ ] Configure countries, currencies, tax, shipping and business timezone.
- [ ] Create least-privilege administrator accounts with MFA.
- [ ] Add health checks and alerts for application, payment, webhook and fulfilment failures.
- [ ] Add budget and usage alerts for Workers, D1 and R2.
- [ ] Complete test purchases for supported payment and region combinations.
- [ ] Generate a test edition and verify the complete fulfilment workflow.
- [ ] Verify robots, sitemap, metadata, social previews and structured data.
- [ ] Verify public policies and consent records.
- [ ] Perform post-deployment smoke tests.

## 19. Client Inputs Required Before Production

> Client-owned gate: complete and approve `CLIENT_INPUTS_TEMPLATE.md`. These items must not be inferred from placeholders or development configuration.

- [ ] Legal business name and registration details.
- [x] Confirmed ownership of `offscrolltimes.com` and Cloudflare DNS delegation.
- [x] Approved logo asset supplied and integrated into the application.
- [ ] Founder/team biography and approved photographs.
- [ ] Product photographs and sample issue pages.
- [ ] Monthly base price and duration discounts.
- [ ] Printing schedule and monthly order cut-off.
- [ ] Supported countries, currencies, taxes, delivery charges and estimates.
- [ ] Pause, cancellation, refund, replacement and renewal rules.
- [ ] Support email, WhatsApp number, business address and operating hours.
- [ ] Razorpay merchant account and completed KYC.
- [ ] Google Cloud and Microsoft Entra application ownership.
- [ ] Printer, fulfilment and courier arrangements.
- [ ] Approved legal documents.
- [ ] Genuine testimonials approved for publication.

## 20. Final Acceptance Criteria

- [x] No customer-facing or operational dependency on Whop remains.
- [ ] Google and Microsoft authentication work securely in production.
- [x] Customers can access only their own records.
- [x] Administrators can access only authorised admin functionality.
- [ ] Razorpay payment is verified server-side before entitlement activation.
- [ ] Duplicate callbacks or webhooks cannot create duplicate orders, payments or subscriptions.
- [x] Historical orders retain immutable prices and payment references.
- [x] Paid entitlement produces an accurate monthly print and dispatch list.
- [x] Customer dashboard and admin records use the same canonical subscription and fulfilment records.
- [ ] In-app confirmations and receipts work, with no newsletter or application-managed email functionality.
- [ ] Backup restoration, audit history and incident procedures have been tested.
- [ ] Accessibility, security, performance, legal and business-owner approvals are complete.
- [ ] Production smoke tests pass after deployment.
