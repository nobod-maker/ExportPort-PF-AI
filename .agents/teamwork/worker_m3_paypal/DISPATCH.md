## 2026-11-09T12:40:50Z
You are worker_m3_paypal, working in directory:
d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m3_paypal\

Mandatory Inputs:
1. Read the verbatim user request at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the master architecture and contracts at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\PROJECT.md
3. Review survey architecture at:
   d:\ExportPilot PayFlow AI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Milestone Objective:
Implement Milestone 3: PayPal Sandbox & Webhook Reconciliation Module for ExportPilot PayFlow AI.
Git Branch: Switch to `feature/paypal` (`git checkout feature/paypal`).

Exclusive File Ownership:
- `lib/paypal/client.ts`
- `lib/paypal/orders.ts`
- `lib/paypal/webhooks.ts`
- `app/api/paypal/create-order/route.ts`
- `app/api/paypal/capture-order/route.ts`
- `app/api/paypal/webhook/route.ts`
- `tests/unit/paypal.test.ts`

Tasks to Implement:
1. PayPal Client (`lib/paypal/client.ts`):
   - OAuth 2.0 token management: cached client credentials grant against `https://api-m.sandbox.paypal.com/v1/oauth2/token`.
   - Sandbox environment detection, error classification, and offline mock sandbox simulator fallback when credentials are not injected.
2. Order Creation & Capture (`lib/paypal/orders.ts`):
   - `createPayPalOrder`: Create Order with `intent: CAPTURE`. Recalculate totals directly from server database order items (NEVER trust client-provided totals). Set `custom_id = order_id` for reconciliation.
   - `capturePayPalOrder`: Call `/v2/checkout/orders/{id}/capture` with `PayPal-Request-Id` idempotency header.
3. Webhook Verification & 4-Way Reconciliation (`lib/paypal/webhooks.ts`):
   - `verifyWebhookSignature`: Call PayPal's official `/v1/notifications/verify-webhook-signature` endpoint passing transmission headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`) and `webhook_id`.
   - Event Deduplication: Ensure duplicate events (`paypal_event_id`) are safely ignored.
   - 4-Way Reconciliation: Before marking order `paid`, strictly verify:
     1. Internal order ID matches `custom_id`
     2. PayPal order ID matches stored order
     3. Captured amount matches order total in minor units
     4. Currency matches
   - Rule: Never mark an order paid based only on a browser redirect!
4. API Route Handlers:
   - `POST /api/paypal/create-order`: Validates request, checks order status is `quoted`, creates PayPal order.
   - `POST /api/paypal/capture-order`: Validates request, executes server-side capture, updates payment and order status.
   - `POST /api/paypal/webhook`: Verifies signature, deduplicates, reconciles, and records audit event in `activity_events`.
5. Unit Tests:
   - Create `tests/unit/paypal.test.ts` testing OAuth token exchange, order creation payload formatting, capture idempotency, webhook signature verification logic, duplicate event rejection, and 4-way reconciliation mismatches.
   - Run `npm test` and `npm run build` to verify zero errors.
   - Commit changes to `feature/paypal`: `git add . && git commit -m "feat(paypal): implement orders v2 sandbox, capture, webhook verification, and 4-way reconciliation"`.

Deliverables:
- Write detailed handoff report to:
  `d:\ExportPilot PayFlow AI\.agents\teamwork\worker_m3_paypal\handoff.md`.
- Send completion message to orchestrator.


## 2026-11-09T13:25:58Z
**Context**: Milestone 3 Delivery Check
**Content**: All Milestone 3 code artifacts (PayPal client, orders, webhooks, 4-way reconciliation, API routes, unit tests) are in place. Please run tests/build verification, commit to `feature/paypal`, write your `handoff.md` in your agent folder, and reply with your completion report.
**Action**: Finalize handoff.md and reply with completion summary.
