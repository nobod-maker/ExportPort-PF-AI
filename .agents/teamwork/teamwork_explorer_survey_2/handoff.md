# Handoff Report: Technical Architecture & Contracts Survey

**Agent**: teamwork_explorer_survey_2  
**Role**: Architectural Analyst & Contract Designer  
**Target Milestone**: Phase 0 — Technical Architecture & Interface Specification  
**Recipient**: Lead Agent / Orchestrator (`5e5ca37c-d275-4ce0-bb26-2c11af4f9753`)  
**Status**: COMPLETE (Hard Handoff)  
**Detailed Spec Location**: `d:\ExportPilot PayFlow AI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md`

---

## 1. Observation

1. **User Prompt & Mandate**:
   - File: `d:\ExportPilot PayFlow AI\.agents\teamwork\ORIGINAL_REQUEST.md`
   - Lines 41–50:
     > "DATABASE: profiles, buyers, export_orders, order_items, paypal_payments, paypal_webhook_events, activity_events. Create migrations, indexes, constraints and RLS.
     > API ROUTES: POST /api/ai/parse-order, POST /api/paypal/create-order, POST /api/paypal/capture-order, POST /api/paypal/webhook"
   - Lines 51–71:
     > "SECURITY: Never expose secrets in browser code. Never trust browser-supplied totals. Use integer minor units for money. Never fabricate missing prices. Require seller approval. Require buyer approval. Verify PayPal webhook signatures. Deduplicate webhook events. Verify order ID, capture ID, amount and currency. Never mark an order paid based only on a browser redirect. Clearly label Sandbox payments.
     > AI: Use strict structured JSON output. Add provider timeout and fallback. Use only explicit buyer-provided information. Do not invent shipping costs, taxes, customs fees or delivery dates. Use cached sample responses when provider quota is exhausted. Never claim sample mode is a live LLM response."

2. **Blueprint Specification**:
   - File: `d:\ExportPilot PayFlow AI\ExportPilot_PayFlow_AI_Implementation_Blueprint.docx` (extracted to `.agents\teamwork\teamwork_explorer_survey_2\blueprint_text.txt`)
   - Lines 73–77:
     > "Use Supabase Postgres. Store monetary values as integer minor units (e.g., paise/cents) plus ISO currency code; never use floating-point arithmetic for money... Enable Row Level Security. Every user-owned table must enforce owner_id = auth.uid() via policies. Keep webhook processing in a trusted server environment; do not let browser clients insert verified payment events."
   - Lines 81–86:
     > "Use PayPal Checkout Orders v2 in Sandbox... create order with intent CAPTURE... capture on the server after buyer approval... Use PayPal's official webhook signature verification endpoint/API and verify the event before changing payment state. Make capture and webhook handlers idempotent. Handle duplicate event IDs and repeated capture attempts... Reconcile the webhook resource/order/capture IDs and amount/currency against the stored pending payment... Never mark Paid from a success query parameter alone."

3. **Workspace State**:
   - Command: `pwsh -Command "node -v; npm -v"` returned `v22.14.0` and `11.3.0`.
   - Command: `pwsh -Command "git status"` exited with code 1 (`fatal: not a git repository`), confirming greenfield project status.

---

## 2. Logic Chain

1. **Derivation of Database Schema from Financial & Security Requirements**:
   - *Premise (Observation 1 & 2)*: Monetary operations in export trade must never suffer rounding errors, and payment states must be strictly immutable to client tampering.
   - *Inference*: Using `bigint` for minor units (cents) eliminates floating-point drift. A dedicated `paypal_payments` table with `paypal_order_id` (unique) and `paypal_capture_id` ensures 1-to-1 traceability with PayPal.
   - *Inference*: Public RLS policies must disallow client writes on `paypal_payments` and `paypal_webhook_events`. Only server-side route handlers using `SUPABASE_SERVICE_ROLE_KEY` are permitted to mutate payment records and record verified webhooks.

2. **Derivation of PayPal Sandbox Lifecycle & Verification**:
   - *Premise (Observation 1 & 2)*: Orders must require seller approval before payment creation, client totals cannot be trusted, and redirects are not proof of payment.
   - *Inference*: In `POST /api/paypal/create-order`, the server must load `export_orders` by ID, verify `status === 'quoted'`, recalculate `subtotal_minor` and `total_minor` directly from `order_items`, and pass those server-verified figures to PayPal's `/v2/checkout/orders` endpoint.
   - *Inference*: In `POST /api/paypal/capture-order`, capture occurs server-side via `/v2/checkout/orders/{id}/capture` with an idempotency key (`PayPal-Request-Id`).
   - *Inference*: In `POST /api/paypal/webhook`, the server invokes PayPal's `/v1/notifications/verify-webhook-signature` endpoint. Idempotency is enforced by an atomic `ON CONFLICT (paypal_event_id) DO NOTHING` query on `paypal_webhook_events`.
   - *Inference*: Before updating `export_orders.status` to `paid`, the 4-way reconciliation rule must verify: (1) internal order ID matches `custom_id`, (2) PayPal order ID matches, (3) amount matches, and (4) currency matches.

3. **Derivation of AI Extraction & Fallback Architecture**:
   - *Premise (Observation 1 & 2)*: AI must extract only explicit data from untrusted buyer messages without hallucinating prices, shipping fees, or delivery dates, and fallback gracefully when free quotas are exhausted.
   - *Inference*: A strict Zod schema (`AIExtractionResultSchema`) must define `unit_price_minor` and `shipping_minor` as nullable. Missing fields are explicitly cataloged in `missing_fields`.
   - *Inference*: A multi-provider adapter supporting Gemini 1.5/2.0 Flash (free tier) and OpenRouter free models must include an automatic fallback to a verified, high-fidelity sample response (UAE buyer: Tariq Al-Mansoor, 100 leather wallets, HW-WL-01). The response must set `is_fallback: true` so the UI honestly informs the user.

4. **Derivation of API Contracts**:
   - *Premise (Observation 1)*: 4 API routes coordinate the frontend, AI, database, and PayPal.
   - *Inference*: Clear, strongly typed request and response interfaces for each route provide drop-in contracts for the parallel implementation agents (Frontend, PayPal, AI/DB).

---

## 3. Caveats

1. **Supabase Local vs Hosted Connection**: The schema DDL is written in standard ANSI PostgreSQL compatible with Supabase CLI (`supabase/migrations/`) or hosted Supabase SQL Editor. If running locally via Docker/Supabase CLI, Docker must be installed and running.
2. **PayPal Sandbox Webhook Simulation**: When testing on `localhost:3000`, PayPal sandbox servers cannot send webhooks directly unless an ngrok / Cloudflare tunnel is active, or simulated via synthetic test payloads sent directly to `POST /api/paypal/webhook` with mocked verification bypass for development.
3. **LLM Provider API Availability**: Google Gemini API free tier keys and OpenRouter free models are subject to regional limits and per-minute rate limits. The fallback cached sample ensures offline readiness regardless of network or API availability.

---

## 4. Conclusion

The technical architecture, database schema, security policies, PayPal transaction lifecycle, AI extraction adapter, and TypeScript API contracts are fully formulated and documented in `d:\ExportPilot PayFlow AI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md`. 

Downstream workers can immediately adopt:
- `analysis.md` Section 1.3 for `supabase/migrations/001_initial_schema.sql`
- `analysis.md` Section 2 for `lib/paypal/client.ts`, `lib/paypal/orders.ts`, and `lib/paypal/webhooks.ts`
- `analysis.md` Section 3 for `lib/ai/provider.ts` and `lib/validation/order.ts`
- `analysis.md` Section 4 for `types/index.ts` and route handler definitions

---

## 5. Verification Method

1. **Verify Database DDL Syntax**:
   - Inspect `analysis.md` Section 1.3.
   - Run SQL syntax validation using PostgreSQL or Supabase CLI:
     ```bash
     # Verify syntax in psql or Supabase migration tool
     cat supabase/migrations/001_initial_schema.sql | psql -U postgres -d postgres --dry-run
     ```
2. **Verify TypeScript Type Declarations**:
   - Ensure `analysis.md` Section 4 types compile cleanly without errors using `tsc --noEmit`.
3. **Verify Currency Utilities**:
   - Verify `lib/money.ts` conversion:
     - `minorToDecimalString(250000)` === `"2500.00"`
     - `decimalToMinor("2500.00")` === `250000`
4. **Invalidation Conditions**:
   - Any floating-point representation of money in DB schema or internal calculations invalidates the financial model.
   - Any client-side parameter allowed to set `status = 'paid'` or define order total invalidates the security model.
