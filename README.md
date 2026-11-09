# ExportPilot PayFlow AI

> **PayPal AI Hackathon 2026 Submission**  
> *Autonomous Cross-Border Export Order & PayPal Payment Platform with Anti-Hallucination AI Extraction, Server-Side Minor-Unit Reconciliation, and AG Grid Management.*

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5_Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Dark_Fintech-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![PayPal Orders v2](https://img.shields.io/badge/PayPal-Orders_v2_Sandbox-003087?logo=paypal)](https://developer.paypal.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?logo=supabase)](https://supabase.com/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-v33_Community-E0234E)](https://www.ag-grid.com/)
[![Tests](https://img.shields.io/badge/Tests-163%2F163_Passing_(100%25)-brightgreen)](./TEST_READY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 📌 Executive Summary

Small and medium-sized exporters worldwide routinely lose deals and suffer payment defaults because cross-border trade negotiations happen in messy unstructured text channels—WhatsApp, email threads, and PDF RFQs. Inquiries arrive with missing delivery dates, unstated Incoterms, and vague packaging requests. Exporters manually calculate CIF/FOB pricing in spreadsheets, send informal invoices, and struggle with currency risks, duplicate webhooks, and payment fraud.

**ExportPilot PayFlow AI** transforms this broken pipeline into a seamless, automated, and mathematically verified workflow:
1. **Unstructured Inquiry Intake**: A UAE buyer inquires about purchasing 100 handmade leather wallets (`HW-WL-01`).
2. **Anti-Hallucination AI Extraction**: Our multi-provider LLM engine (Google Gemini API free tier / OpenRouter free models / zero-latency deterministic UAE cache) extracts structured buyer and item data strictly from stated facts—refusing to invent prices, shipping terms, or duty rates. Missing fields are explicitly cataloged.
3. **Seller-Controlled Quotation Engine**: The exporter reviews the extracted items, inputs unit pricing ($35.00/unit) and air freight ($150.00), specifies Incoterms (FOB Dubai), and authorizes the formal quote.
4. **Authoritative Minor-Unit Recalculation**: Client-submitted totals are **never trusted**. All calculations (subtotal: 350,000¢, freight: 15,000¢, total: 365,000¢ = $3,650.00 USD) are recomputed server-side in 64-bit integer minor units.
5. **PayPal Orders v2 Sandbox Checkout**: Upon seller approval, the platform initiates a PayPal Orders v2 Sandbox session with `intent: CAPTURE`, binding the transaction directly to the verified order snapshot.
6. **Idempotent Server Capture**: When the buyer approves the checkout in the PayPal modal, our backend captures funds using the `PayPal-Request-Id` idempotency header.
7. **Cryptographic Webhook Verification**: Webhook notifications (`PAYMENT.CAPTURE.COMPLETED`) are verified cryptographically via PayPal's `/v1/notifications/verify-webhook-signature` API and deduplicated atomically against the database.
8. **4-Way Payment Reconciliation Guardrail**: The backend independently validates:
   - `order_id` matches the internal export order,
   - `paypal_order_id` matches the transaction record,
   - `amount_minor` matches the quoted grand total exactly (365,000 cents),
   - `currency` matches `USD`.  
   Only when all 4 checks pass is the order marked `paid`. Any mismatch flags `needs_review` and halts fulfillment.
9. **Real-Time AG Grid Dashboard & Audit Timeline**: The exporter monitors active orders, payments, Incoterms, and a chronological audit log with commercial invoice printing.

---

## 🏗️ System Architecture

```
                                [ International Buyer (UAE) ]
                                             │
                                    Submits WhatsApp/Email
                                     Unstructured RFQ Text
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │     Next.js 14 App Router (Fintech UI)    │
                       │    Dark Navy (#0B1120) & Emerald (#10B981)│
                       └─────────────────────┬─────────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
    ┌───────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
    │  AI Extraction Engine │   │ Quotation Review Engine │   │ PayPal Gateway Client   │
    │  • Gemini 1.5 Flash   │   │ • Seller Approval Gate  │   │ • OAuth 2.0 Token Cache │
    │  • OpenRouter Free    │   │ • Minor-Unit Math       │   │ • Orders v2 /checkout   │
    │  • Anti-Hallucination │   │ • Server Recalculation  │   │ • Server Capture        │
    │  • Deterministic Cache│   │ • Snapshot Immutability │   │ • Webhook Verify API    │
    └──────────┬────────────┘   └────────────┬────────────┘   └────────────┬────────────┘
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │      Supabase PostgreSQL Database         │
                       │   • 7 Production Tables • Strict RLS      │
                       │   • BIGINT Minor Units (Cents/Fils)       │
                       │   • Atomic Webhook Deduplication          │
                       │   • 4-Way Reconciliation Audit Log        │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │        Enterprise Management Suite        │
                       │   • AG Grid Community Edition v33         │
                       │   • Chronological Order Activity Timeline │
                       │   • AI Trade & Incoterms Assistant        │
                       │   • Commercial Invoice & Packing Slip     │
                       └───────────────────────────────────────────┘
```

---

## ✨ Key Features & Capabilities

### 1. Zero-Hallucination AI Order Extraction
- **Prompt Injection Defense**: Extraction prompts ignore instructions embedded in buyer inquiries attempting to set prices to $0 or claim paid status.
- **Strict Zod Schema Validation**: Responses are validated against `AIExtractionResultSchema`.
- **Missing Field Catalog**: Unstated fields (`unit_price_minor`, `shipping_minor`, `delivery_date`) are returned as `null` with explicit alerts in `missing_fields`.
- **High-Fidelity Deterministic Fallback**: Automatic, seamless offline fallback for the authoritative UAE leather wallet inquiry when third-party LLM quota is exhausted or API keys are not supplied.

### 2. Seller-Controlled Quotation & Minor-Unit Math
- **Integer Minor Units**: Stores all currency in integer cents/fils (`subtotal_minor`, `tax_minor`, `total_minor`). Eliminates floating-point rounding errors (e.g., `0.1 + 0.2 === 0.30000000000000004`).
- **Server-Authoritative Pricing**: Client-side total fields are never accepted. Totals are derived directly from line items and freight inputs on the backend.
- **Explicit Approval Gate**: Orders cannot proceed to payment until the exporter transitions the status from `draft` to `quoted`.

### 3. PayPal Orders v2 Sandbox Integration
- **OAuth 2.0 In-Memory Token Cache**: Reuses client credentials tokens with a 60-second safety buffer before expiry.
- **Orders v2 Creation**: Invokes `POST /v2/checkout/orders` with `intent: CAPTURE`, line item breakdowns, and currency validation.
- **Idempotent Capture**: Uses `PayPal-Request-Id` headers to prevent double-charging on network retries.
- **Clear Sandbox Indicators**: Sandbox badges and environment banners throughout the UI and receipts to comply with hackathon guidelines.

### 4. Cryptographic Webhook Verification & 4-Way Reconciliation
- **Signature Verification**: Validates `PAYMENT.CAPTURE.COMPLETED` webhooks by dispatching headers (`paypal-auth-algo`, `paypal-transmission-sig`, `paypal-cert-url`) to PayPal's verification endpoint.
- **Atomic Deduplication**: Events are recorded in `paypal_webhook_events`. Replay attacks return `duplicate` status without altering balances.
- **4-Way Reconciliation**: Compares PayPal gateway return values against database records across:
  1. Internal `order_id`
  2. PayPal `paypal_order_id`
  3. Captured amount in minor units (`amount_minor === total_minor`)
  4. Currency ISO code (`USD`)

### 5. Enterprise Fintech UI & AG Grid
- **Fintech Dark Navy & Emerald Styling**: Tailwind CSS theme engineered for international commerce with clear contrast and high visual hierarchy.
- **AG Grid Community Edition v33**: Real-time table with multi-column sorting, text filtering, status pill renderers, and currency formatting.
- **Order Activity Timeline**: Chronological event tracking from initial RFQ paste to webhook settlement.
- **AI Export Assistant**: Embedded chat assistant specialized in Incoterms (FOB, CIF, EXW), GCC customs tariffs, and payment protection.
- **Demo Seed & Reset**: Instant one-click demo data population containing 5 diverse international export orders.

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [Next.js 14 (App Router)](https://nextjs.org/) |
| **Language** | [TypeScript 5.5](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/), Lucide Icons |
| **Data Grid** | [AG Grid Community Edition v33](https://www.ag-grid.com/) |
| **Validation** | [Zod 3.23](https://zod.dev/) |
| **Database** | [Supabase PostgreSQL](https://supabase.com/) with Row-Level Security (RLS) |
| **Payments** | [PayPal Orders v2 API](https://developer.paypal.com/docs/api/orders/v2/) (Sandbox) |
| **AI Providers** | [Google Gemini 1.5 Flash](https://ai.google.dev/) / [OpenRouter](https://openrouter.ai/) / Offline Fallback |
| **Testing** | [Vitest 3.2](https://vitest.dev/), 5-Tier E2E & Adversarial Test Harness |

---

## 🚀 Quickstart & Installation

### Prerequisites
- Node.js 18.17+ or 20.x
- npm or pnpm
- (Optional) PayPal Developer Sandbox account
- (Optional) Google Gemini or OpenRouter API key
- (Optional) Supabase project (an in-memory repository is provided for zero-config offline runs)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/exportpilot-payflow-ai.git
cd exportpilot-payflow-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PayPal Orders v2 Sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret_here
PAYPAL_WEBHOOK_ID=your_paypal_sandbox_webhook_id_here
PAYPAL_ENVIRONMENT=sandbox

# Supabase PostgreSQL (Optional for local test runs with mock fallback)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...

# AI Provider (Optional: high-fidelity deterministic fallback triggers if unset)
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_PROVIDER_DEFAULT=auto
```

*(Note: ExportPilot PayFlow AI includes full mock fallbacks for Supabase, PayPal, and AI extraction, enabling complete out-of-the-box execution without external cloud accounts!)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Automated Testing & Verification

ExportPilot PayFlow AI includes a comprehensive 5-Tier test suite covering 163 tests with a 100% pass rate:

```bash
# Run all 163 unit and E2E integration tests
npm test

# Run TypeScript compilation check (0 errors required)
npx tsc --noEmit

# Run specific test suites
npx vitest run tests/e2e/order-lifecycle.test.ts     # Order state machine & UAE scenario
npx vitest run tests/e2e/paypal-lifecycle.test.ts    # PayPal Orders v2 & webhook lifecycle
npx vitest run tests/e2e/security-adversarial.test.ts # Tier 5 Security & fraud stress tests
npx vitest run tests/unit/money-adversarial.test.ts   # Minor-unit math IEEE 754 precision
```

### Test Suite Summary:
- **`tests/unit/money.test.ts`** (15 tests): Minor unit conversion, string formatting, order total math.
- **`tests/unit/money-adversarial.test.ts`** (20 tests): Floating-point precision traps (0.1 + 0.2), 99-cent rollover, overflow defense.
- **`tests/unit/validation.test.ts`** (9 tests): Zod schema contracts for export orders and buyers.
- **`tests/unit/validation-adversarial.test.ts`** (28 tests): Injection attack vectors, boundary checks, Unicode.
- **`tests/unit/ai-db.test.ts`** (25 tests): Multi-provider adapter, prompt extraction, missing-field catalog, SQL DDL validation.
- **`tests/unit/paypal.test.ts`** (31 tests): OAuth 2.0 token caching, Orders v2 creation/capture, webhook signature verification.
- **`tests/unit/frontend.test.ts`** (6 tests): AG Grid column definitions, status badge styling, store operations.
- **`tests/e2e/order-lifecycle.test.ts`** (13 tests): Full enquiry-to-approval lifecycle with UAE wallet workload.
- **`tests/e2e/paypal-lifecycle.test.ts`** (5 tests): Full create-order → buyer approve → server capture → webhook reconciliation sequence.
- **`tests/e2e/security-adversarial.test.ts`** (11 tests): Tier 5 attacks: price tampering, replay attacks, forged webhook signatures, currency mismatch detection.

---

## 🛡️ Security & Integrity Architecture

ExportPilot PayFlow AI follows a zero-trust financial architecture:

1. **Integer Minor-Unit Money Invariant**: All values in memory, APIs, and database tables are represented in integer minor units (USD cents). Floating point numbers are strictly disallowed in financial arithmetic.
2. **Never Trust Client Totals**: The server recalculates subtotals, shipping, and taxes from source line items before initiating PayPal checkouts.
3. **Seller Approval State Guard**: PayPal checkout sessions cannot be created for orders in `draft` or `analyzed` states; an explicit seller transition to `quoted` is enforced.
4. **Cryptographic Webhook Validation**: Webhook payloads are verified against PayPal's verification API using certificate chain validation (`paypal-cert-url`, `paypal-transmission-sig`).
5. **Deduplication Idempotency**: Webhook events are tracked in a dedicated table with a `UNIQUE` constraint on `paypal_event_id`. Duplicate deliveries are safely rejected without side-effects.
6. **4-Way Reconciliation**: Payment status is updated to `paid` if and only if internal order ID, PayPal transaction ID, capture amount, and ISO currency code align 100%. Mismatches trigger an administrative security freeze (`needs_review`).
7. **Database Row Level Security (RLS)**: Profiles, buyers, orders, items, and payment transactions are secured with tenant-level RLS policies (`owner_id = auth.uid()`). Service role keys are restricted exclusively to server routes.

---

## 💳 PayPal Sandbox Testing Guide

To test the end-to-end PayPal checkout in Sandbox mode:

1. **Navigate to an Approved Order**:
   - Go to `/orders` and select an order with status **Quoted** (e.g. order `EXP-2026-001`, or create one via `/orders/new`).
   - Click **Pay Online** or navigate to `/orders/[id]/pay`.
2. **Launch PayPal Checkout**:
   - Click the gold **PayPal Sandbox Checkout** button.
   - The PayPal popup modal opens pointing to `sandbox.paypal.com`.
3. **Authenticate with Sandbox Buyer Account**:
   - Use a PayPal Developer Sandbox Personal account (e.g. `buyer@personal.example.com`).
   - Review the order details: Payee, Description (`Export Order EXP-2026-001: 100x Handmade Leather Wallet`), and total amount (`$3,650.00 USD`).
4. **Complete Payment Approval**:
   - Click **Complete Purchase** or **Pay Now**.
   - PayPal redirects to our callback handler, which immediately issues `POST /api/paypal/capture-order`.
5. **Observe Immediate Capture & Timeline Update**:
   - The receipt displays PayPal Capture ID (e.g., `CAP-XXXXXXXXXXXXXX`).
   - The activity timeline records:
     - `PAYMENT_CAPTURED`: Funds captured via PayPal Orders v2.
     - `WEBHOOK_RECONCILED`: 4-way reconciliation verified against order ledger.
     - Status transitions to `paid`.

---

## 🤖 Multi-Agent Autonomous Development

This application was engineered autonomously using Google Antigravity's multi-agent teamwork architecture. Five specialized subagents operated across dedicated Git branches with strict non-overlapping file ownership:

```
[ Teamwork Orchestrator ]
         │
         ├── worker_m1_foundation (Branch: main) ──────── Core contracts, minor-unit money engine, Zod schemas
         ├── worker_m2_aidb       (Branch: feature/ai-db) ──── Supabase DDL, RLS, Gemini/OpenRouter AI adapter
         ├── worker_m3_paypal     (Branch: feature/paypal) ─── PayPal Orders v2, OAuth caching, webhook verification
         ├── worker_m4_frontend   (Branch: feature/frontend) ─ AG Grid v33, Fintech UI, quotation editor, checkout
         ├── worker_m5_testwriter (Branch: feature/e2e-testing) 5-Tier E2E test harness & adversarial security tests
         └── worker_m6_integrator (Branch: main) ──────── Final branch merges, build verification & submission package
```

All feature branches merged cleanly into `main` with zero merge conflicts, 100% test coverage, and a production build passing with exit code 0.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
