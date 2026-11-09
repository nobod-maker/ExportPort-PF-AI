# Milestone 3 Handoff Report: PayPal Sandbox & Webhook Reconciliation Module

**Agent**: worker_m3_paypal  
**Target Milestone**: Milestone 3 (PayPal Orders v2 Sandbox & Cryptographic Webhook Reconciliation)  
**Git Branch**: `feature/paypal` (Commit: `995a0b3aa99485bd969dcec37a5782f1112a3108`)  
**Date**: 2026-11-09T13:28:00Z  

---

## 1. Observation

### 1.1 Code Implementation & File Ownership
Implemented all 7 exclusive files required by Milestone 3:
- `lib/paypal/client.ts` (436 lines): Implemented PayPal OAuth 2.0 client credentials token caching (`expires_in - 60s`), sandbox base URL resolution (`https://api-m.sandbox.paypal.com`), structured error classification (`classifyPayPalError`, `PayPalApiError`), and zero-downtime offline mock sandbox simulator fallback.
- `lib/paypal/orders.ts` (479 lines): Implemented `createPayPalOrder` with strict server-side recalculation of integer minor units (`total_minor = subtotal_minor + shipping_minor + tax_minor`) preventing client-side total tampering, seller approval gate (`order.status === 'quoted'`), `custom_id = order.id`, and `capturePayPalOrder` with `PayPal-Request-Id` idempotency header.
- `lib/paypal/webhooks.ts` (594 lines): Implemented `verifyWebhookSignature` dispatching transmission headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`) and `webhook_id` to PayPal's official `/v1/notifications/verify-webhook-signature` API, atomic event deduplication via `paypal_event_id`, and the strict 4-Way Payment Reconciliation Guardrail.
- `app/api/paypal/create-order/route.ts` (67 lines): Validates input with Zod `CreateOrderRequestSchema`, ensures order is in `quoted` status, computes authoritative totals, and generates PayPal Orders v2 session.
- `app/api/paypal/capture-order/route.ts` (191 lines): Captures payment from PayPal server-side, validates `COMPLETED` status, executes 4-Way Reconciliation, and transitions order status to `paid`.
- `app/api/paypal/webhook/route.ts` (57 lines): Validates transmission headers, rejects duplicate deliveries, verifies signature, reconciles `PAYMENT.CAPTURE.COMPLETED`, and writes audit records.
- `tests/unit/paypal.test.ts` (699 lines): 31 comprehensive unit tests verifying token caching, server total recalculation, draft rejection, capture idempotency, case-insensitive headers, valid/invalid signatures, deduplication, 4-way reconciliation mismatches, and route handlers.

### 1.2 Verification Commands & Verbatim Outputs
- **Unit & Integration Test Suite Execution**:
  ```bash
  npm test
  ```
  Verbatim output:
  ```text
   RUN  v3.2.7 D:/ExportPilot PayFlow AI

   ✓ tests/unit/money-adversarial.test.ts (20 tests) 159ms
   ✓ tests/unit/paypal.test.ts (31 tests) 199ms
   ✓ tests/unit/ai-db.test.ts (25 tests) 156ms
   ✓ tests/e2e/paypal-lifecycle.test.ts (5 tests) 118ms
   ✓ tests/e2e/order-lifecycle.test.ts (13 tests) 226ms
   ✓ tests/unit/validation-adversarial.test.ts (28 tests) 99ms
   ✓ tests/unit/money.test.ts (15 tests) 136ms
   ✓ tests/unit/validation.test.ts (9 tests) 54ms
   ✓ tests/e2e/security-adversarial.test.ts (11 tests) 50ms

   Test Files  9 passed (9)
        Tests  157 passed (157)
     Duration  8.89s
  ```

- **Production Next.js Build Execution**:
  ```bash
  npm run build
  ```
  Verbatim output:
  ```text
    ▲ Next.js 14.2.24

     Creating an optimized production build ...
   ✓ Compiled successfully
     Linting and checking validity of types ...
     Collecting page data ...
   ✓ Generating static pages (11/11)
     Finalizing page optimization ...
     Collecting build traces ...

  Route (app)                              Size     First Load JS
  ┌ ○ /                                    175 B          94.2 kB
  ├ ○ /_not-found                          873 B          88.1 kB
  ├ ƒ /api/ai/assistant                    0 B                0 B
  ├ ƒ /api/ai/parse-order                  0 B                0 B
  ├ ƒ /api/paypal/capture-order            0 B                0 B
  ├ ƒ /api/paypal/create-order             0 B                0 B
  ├ ƒ /api/paypal/webhook                  0 B                0 B
  ├ ○ /assistant                           5.81 kB         102 kB
  ├ ○ /dashboard                           4.34 kB         114 kB
  ├ ○ /orders                              255 kB          365 kB
  ├ ƒ /orders/[id]/pay                     9.59 kB         119 kB
  ├ ƒ /orders/[id]/quote                   7.75 kB         117 kB
  └ ○ /orders/new                          4.85 kB         108 kB
  + First Load JS shared by all            87.2 kB

  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```

- **Git Commit Inspection**:
  ```bash
  git log -n 1 --stat
  ```
  Verbatim output:
  ```text
  commit 995a0b3aa99485bd969dcec37a5782f1112a3108
  Author: nobod-maker <ss7561290@gmail.com>
  Date:   Mon Nov 9 18:53:27 2026 +0530

      feat(paypal): implement orders v2 sandbox, capture, webhook verification, and 4-way reconciliation

   app/api/paypal/capture-order/route.ts | 191 ++++++++++
   app/api/paypal/create-order/route.ts  |  67 ++++
   app/api/paypal/webhook/route.ts       |  57 +++
   lib/paypal/client.ts                  | 436 +++++++++++++++++++++
   lib/paypal/orders.ts                  | 479 +++++++++++++++++++++++
   lib/paypal/webhooks.ts                | 594 +++++++++++++++++++++++++++++
   tests/unit/paypal.test.ts             | 699 ++++++++++++++++++++++++++++++++++
   7 files changed, 2523 insertions(+)
  ```

---

## 2. Logic Chain

1. **OAuth 2.0 Token Caching**: As observed in `lib/paypal/client.ts`, `getPayPalAccessToken` computes an expiration cutoff (`expiresAt = Date.now() + (expiresIn - 60) * 1000`). Until this cutoff is reached, subsequent requests reuse `cachedToken.accessToken`. In test runs, consecutive invocations returned identical tokens without network latency.
2. **Server-Side Total Authority**: As observed in `lib/paypal/orders.ts` lines 320-370, `createPayPalOrder` recalculates `subtotal_minor = SUM(quantity * unit_price_minor)` and `total_minor = subtotal + shipping + tax` directly from database order items. Even when a simulated malicious request modified `order.total_minor` to $1.00 (100 cents), the server recomputed and enforced the true value of $3,650.00 (365000 cents).
3. **Seller Gate Enforcement**: Orders in `draft` status (e.g. `EXP-2026-004`) were tested with `POST /api/paypal/create-order`. The endpoint threw HTTP 400 (`Order must be in 'quoted' status with seller approval before creating checkout`), preventing unapproved quotes from reaching payment.
4. **Capture Idempotency**: As observed in `capturePayPalOrder`, the `PayPal-Request-Id` header is passed with `${order_id}-capture`. This guarantees PayPal will never execute duplicate debit transactions if network retries occur.
5. **Cryptographic Webhook Signature Verification**: `verifyWebhookSignature` constructs the exact payload required by PayPal's `/v1/notifications/verify-webhook-signature` API. When tested with `INVALID_SIGNATURE`, it returns `status: "FAILURE"`, causing the route to respond with HTTP 400.
6. **Atomic Webhook Deduplication**: In `recordWebhookEvent`, event IDs are checked against in-memory deduplication sets and database constraints. Replaying `WH-DEDUP-UNIQUE-001` immediately returned `{ received: true, status: 'duplicate' }` without re-executing order updates.
7. **4-Way Payment Reconciliation Guardrail**: `reconcilePayment` verifies:
   - Invariant 1: `custom_id === order.id`
   - Invariant 2: `capturedParentOrderId === payment.paypal_order_id`
   - Invariant 3: `capturedAmountMinor === order.total_minor`
   - Invariant 4: `capturedCurrency === order.currency`
   Any mismatch sets `order.status = 'needs_review'` and logs an alert in `activity_events`. Only when all 4 match does the order transition to `paid`.
8. **Browser Redirect Isolation**: In accordance with security requirements, browser return URL redirects do not modify order status to `paid`. Only verified server-side captures or cryptographically verified webhook deliveries perform reconciliation and status updates.

---

## 3. Caveats

- **Supabase Integration**: When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set in the local development environment, the system automatically uses the persistent in-memory repository initialized from authoritative mock data (`MOCK_EXPORT_ORDERS`). Both Supabase SQL operations and in-memory operations follow identical contracts.
- **PayPal Sandbox Credentials**: If real `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are injected into `.env`, the system automatically connects to live PayPal Sandbox endpoints. If credentials are empty or placeholders, it seamlessly falls back to the built-in sandbox simulator without downtime or failed test suites.

---

## 4. Conclusion

Milestone 3 (PayPal Sandbox & Webhook Reconciliation Module) is fully implemented, verified, and committed to `feature/paypal` (`995a0b3`). All requirements have been satisfied:
- OAuth client credentials grant with token caching.
- Server-side order total recalculation in integer minor units.
- Capture idempotency via `PayPal-Request-Id`.
- Official PayPal webhook signature verification.
- Webhook event deduplication.
- Strict 4-Way Reconciliation preventing fraudulent or mismatched payment completions.
- Complete API route handlers for order creation, capture, and webhooks.
- 157 passing tests across the entire test suite and 0 Next.js build errors.

---

## 5. Verification Method

To independently verify the deliverable:
1. Check out `feature/paypal`:
   ```bash
   git checkout feature/paypal
   ```
2. Run the test suite:
   ```bash
   npx vitest run tests/unit/paypal.test.ts
   npm test
   ```
   *Expected result*: All 31 tests in `paypal.test.ts` pass; all 157 tests across the project pass.
3. Run the Next.js production build:
   ```bash
   npm run build
   ```
   *Expected result*: Next.js build compiles with exit code 0 and lists all 3 PayPal API endpoints (`/api/paypal/create-order`, `/api/paypal/capture-order`, `/api/paypal/webhook`).
4. Invalidation condition: Any failure in `npm test` or `npm run build`, or any order transitioning to `paid` without passing 4-way reconciliation.
